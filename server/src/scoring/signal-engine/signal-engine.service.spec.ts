import { Test, TestingModule } from '@nestjs/testing';
import { SignalEngineService } from './signal-engine.service';
import { GITHUB_REST_FIXTURE } from '../github-adapter/__fixtures__/github-rest.fixture';
import { GITHUB_GRAPHQL_FIXTURE } from '../github-adapter/__fixtures__/github-graphql.fixture';
import { GITHUB_EVENTS_FIXTURE } from '../github-adapter/__fixtures__/github-events.fixture';
import { FraudTier } from '../firewall/types';

describe('SignalEngineService', () => {
  let service: SignalEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SignalEngineService],
    }).compile();

    service = module.get<SignalEngineService>(SignalEngineService);
  });

  const accountCreatedAt = '2020-01-01T00:00:00Z'; // 6 years old

  /**
   * Helper to create a robust mock firewall result that satisfies minimum thresholds by default.
   */
  function createMockFirewallResult(overrides: any = {}) {
    const base = {
      rest: {
        ...GITHUB_REST_FIXTURE,
        commits: {
          ...GITHUB_REST_FIXTURE.commits,
          '101': Array.from({ length: 150 }, (_, i) => ({
            commit: { author: { date: new Date(Date.now() - i * 3600 * 1000).toISOString() }, message: 'commit' },
            streakOnly: false
          }))
        },
        languages: {
          ...GITHUB_REST_FIXTURE.languages,
          '101': { TypeScript: 1000, Rust: 2000, Solidity: 3000 }
        }
      },
      graphql: {
        ...GITHUB_GRAPHQL_FIXTURE,
        pullRequests: Array.from({ length: 15 }, (_, i) => ({
          id: `pr-${i}`,
          createdAt: new Date().toISOString(),
          mergedAt: new Date().toISOString(),
          state: 'MERGED',
          repository: { 
            name: i === 0 ? 'solana' : 'other', 
            owner: { login: i === 0 ? 'solana-labs' : 'other' },
            stargazerCount: 1000 
          },
          reviews: { nodes: [] },
          commits: { nodes: [] }
        })),
        reviewsGiven: Array.from({ length: 10 }, (_, i) => ({
          id: `rev-${i}`,
          body: 'Detailed review comment that is substantive enough.',
          createdAt: new Date().toISOString(),
          pullRequest: { repository: { name: 'repo', owner: { login: 'other' }, stargazerCount: 500 } }
        })),
        contributionCalendar: {
          ...GITHUB_GRAPHQL_FIXTURE.contributionCalendar,
          weeks: Array.from({ length: 52 }, (_, i) => ({
            contributionDays: Array.from({ length: 7 }, (_, j) => ({
              contributionCount: 5,
              date: new Date(Date.now() - (52 - i) * 7 * 24 * 60 * 60 * 1000 + j * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            })),
          })),
        }
      },
      events: GITHUB_EVENTS_FIXTURE,
      fetchedAt: new Date().toISOString(),
    };

    // Construct the final cleanedData by merging base with overrides.cleanedData if present
    const cleanedData = {
      ...base,
      ...(overrides.cleanedData || {})
    };

    // Deep merge sections if they exist in overrides
    if (overrides.cleanedData) {
      if (overrides.cleanedData.graphql) {
        cleanedData.graphql = { ...base.graphql, ...overrides.cleanedData.graphql };
      }
      if (overrides.cleanedData.rest) {
        cleanedData.rest = { ...base.rest, ...overrides.cleanedData.rest };
      }
      if (overrides.cleanedData.events) {
        cleanedData.events = { ...base.events, ...overrides.cleanedData.events };
      }
    }

    // Now construct the final result, ensuring cleanedData is the merged one
    const result = {
      removedRepos: [],
      flaggedRepos: [],
      fraudScore: 0,
      fraudTier: FraudTier.CLEAN,
      firewallLog: [],
      ...overrides,
      cleanedData // Ensure our merged cleanedData wins
    };

    return result;
  }

  describe('compute', () => {
    it('should compute signals with account metadata', () => {
      const mockResult = createMockFirewallResult();
      const result = service.compute('arturo', mockResult as any, accountCreatedAt);
      expect(result.signals).toBeDefined();
      expect(result.signals.activeWeeksRatio.excluded).toBe(false);
      expect(result.signals.activeWeeksRatio.value).toBeGreaterThan(0);
    });

    it('should exclude signals failing minimum sample threshold and sync excludedSignals array', () => {
      // Create result with 0 PRs
      const lowDataResult = createMockFirewallResult({
        cleanedData: { graphql: { pullRequests: [] } }
      });
      
      const result = service.compute('arturo', lowDataResult as any, accountCreatedAt);
      
      // Check signal object
      expect(result.signals.prAcceptanceRate.excluded).toBe(true);
      expect(result.signals.prAcceptanceRate.exclusionReason).toContain('Need 10 external PRs');
      
      // Check synchronized excluded array
      const excludedArrayMatch = result.excludedSignals.find(s => s.key === 'prAcceptanceRate');
      expect(excludedArrayMatch).toBeDefined();
      expect(excludedArrayMatch?.reason).toBe(result.signals.prAcceptanceRate.exclusionReason);
    });

    it('should trigger consistency validator for anomalies when dependencies are NOT excluded', () => {
      // Mock result with high acceptance but low collaboration depth
      const anomalyResult = createMockFirewallResult({
        cleanedData: {
          graphql: {
            pullRequests: Array.from({ length: 12 }, () => ({
              state: 'MERGED',
              mergedAt: new Date().toISOString(),
              repository: { owner: { login: 'other' }, stargazerCount: 10 },
              reviews: { nodes: [] }
            })),
            reviewsGiven: Array.from({ length: 5 }, () => ({ 
                body: 'Please fix this minor issue here.', // 5 words, length 33
                createdAt: new Date().toISOString(),
                pullRequest: { repository: { name: 't', owner: { login: 'o' }, stargazerCount: 1 } }
            }))
          }
        }
      });

      const result = service.compute('arturo', anomalyResult as any, accountCreatedAt);
      // reviewDepth should be low, acceptance high
      expect(result.consistencyNotes).toContain('Anomaly: High acceptance rate with very low collaboration depth.');
    });

    it('should gracefully skip consistency checks if signals are excluded', () => {
      const excludedResult = createMockFirewallResult({
        cleanedData: { graphql: { pullRequests: [] } }
      });

      const result = service.compute('arturo', excludedResult as any, accountCreatedAt);
      expect(result.signals.prAcceptanceRate.excluded).toBe(true);
      // Should not throw or add note if dependencies are missing
      expect(result.consistencyNotes).toHaveLength(0);
    });

    it('should correctly handle tutorial repo de-weighting', () => {
      const tutorialResult = createMockFirewallResult({
        cleanedData: {
          rest: {
            repos: [
              { id: 201, fork: false, tutorialWeight: 0.3, stargazerCount: 100, createdAt: '2023-01-01' }
            ],
            fileTrees: {
              '201': ['index.js', 'style.css'] // No tests
            }
          }
        }
      });

      const result = service.compute('arturo', tutorialResult as any, accountCreatedAt);
      // starsOnOriginalRepos should skip tutorial repos
      expect(result.signals.starsOnOriginalRepos.value).toBe(0);
      // testFilePresence should be 0
      expect(result.signals.testFilePresence.value).toBe(0);
    });

    it('should compute Web3 signals correctly', () => {
      const result = service.compute('arturo', createMockFirewallResult() as any, accountCreatedAt);
      
      // coreProtocolPrMerges: solana-labs/solana is in our factory
      expect(result.signals.coreProtocolPrMerges.value).toBeGreaterThanOrEqual(1);
      
      // languageEvolutionTrajectory: Factory has TS, Rust, Solidity
      expect(result.signals.languageEvolutionTrajectory.value).toBe(1.0);
    });

    it('should detect private org activity from push events', () => {
        const privateOrgResult = createMockFirewallResult({
          cleanedData: {
            events: {
              events: [
                { type: 'PushEvent', public: false, org: { id: 1 }, repo: { name: 'private-org-repo' } }
              ]
            }
          }
        });
        const result = service.compute('arturo', privateOrgResult as any, accountCreatedAt);
        expect(result.signals.privateOrgActivity.value).toBe(1);
    });
  });
});
