import { Test, TestingModule } from '@nestjs/testing';
import { FirewallService } from '../firewall/firewall.service';
import { SignalEngineService } from '../signal-engine/signal-engine.service';
import { DataCompletenessEngineService } from '../data-completeness-engine/data-completeness-engine.service';
import { PrivacyAdjustmentEngineService } from '../privacy-adjustment-engine/privacy-adjustment-engine.service';
import { FraudTier } from '../firewall/types';
import { VisibilityTier } from '../data-completeness-engine/types';
import { PillarKey } from '../signal-engine/types';

describe('Pipeline Checkpoint B', () => {
  let firewall: FirewallService;
  let signals: SignalEngineService;
  let completeness: DataCompletenessEngineService;
  let privacy: PrivacyAdjustmentEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FirewallService,
        SignalEngineService,
        DataCompletenessEngineService,
        PrivacyAdjustmentEngineService,
      ],
    }).compile();

    firewall = module.get<FirewallService>(FirewallService);
    signals = module.get<SignalEngineService>(SignalEngineService);
    completeness = module.get<DataCompletenessEngineService>(DataCompletenessEngineService);
    privacy = module.get<PrivacyAdjustmentEngineService>(PrivacyAdjustmentEngineService);
  });

  const buildFixture = (overrides: any = {}) => {
    const defaultData = {
      username: 'testuser',
      rest: {
        repos: [],
        commits: {},
        pulls: {},
        fileTrees: {},
        languages: {},
      },
      graphql: {
        contributionCalendar: {
          totalContributions: 0,
          weeks: [],
        },
        pullRequests: [],
        reviewsGiven: [],
      },
      events: {
        events: [],
      },
    };

    // Deep merge or simple override for this test helper
    return { ...defaultData, ...overrides };
  };

  it('TEST B1 — Firewall zeroes correctly', () => {
    const accountCreatedAt = '2024-01-01T00:00:00Z';
    const fixture = buildFixture({
      rest: {
        repos: [
          { id: 'fork-repo', name: 'fork-repo', fork: true, created_at: '2024-02-01T00:00:00Z' },
          { id: 'tutorial-repo', name: 'tutorial-repo', fork: false, created_at: '2024-02-05T00:00:00Z' },
          { id: 'bot-repo', name: 'bot-repo', fork: false, created_at: '2024-03-01T00:00:00Z' },
        ],
        commits: {
          'fork-repo': [], // No original commits
          'bot-repo': Array.from({ length: 55 }).map((_, i) => ({
            commit: {
              author: { date: new Date(new Date('2024-03-01T10:00:00Z').getTime() + i * 60000).toISOString() }, // 1 commit per minute -> 55 mins
              message: i < 50 ? 'Identical message pattern' : `Unique msg ${i}`, // > 80% identical
            },
            stats: { total: 10 },
          })),
        },
        fileTrees: {
          'tutorial-repo': ['index.js', 'style.css'], // Matches index.js and style.css, no tests
        },
      },
    });

    const result = firewall.process('testuser', accountCreatedAt, fixture as any);

    expect(result.removedRepos.some(r => r.repoId === 'fork-repo')).toBe(true);
    expect(result.cleanedData.rest.repos.find(r => r.id === 'fork-repo')).toBeUndefined();
    
    const tutorial = result.cleanedData.rest.repos.find(r => r.id === 'tutorial-repo');
    expect(tutorial).toBeDefined();
    expect(tutorial.tutorialWeight).toBe(0.3);

    const botRepoFlag = result.flaggedRepos.find(r => r.repoId === 'bot-repo');
    expect(botRepoFlag).toBeDefined();
    expect(botRepoFlag!.fraudScoreIncrement).toBeGreaterThanOrEqual(0.25);
    expect(result.fraudTier).toBe(FraudTier.SUSPICIOUS);
  });

  it('TEST B2 — Minimum sample thresholds for developer with 3 PRs', () => {
    const fixture = buildFixture({
      graphql: {
        pullRequests: [
          { mergedAt: '2024-01-01T00:00:00Z', repository: { owner: { login: 'other' }, name: 'repo1' }, reviews: { nodes: [] } },
          { mergedAt: '2024-01-02T00:00:00Z', repository: { owner: { login: 'other' }, name: 'repo2' }, reviews: { nodes: [] } },
          { mergedAt: '2024-01-03T00:00:00Z', repository: { owner: { login: 'other' }, name: 'repo3' }, reviews: { nodes: [] } },
        ],
        contributionCalendar: { weeks: [] },
        reviewsGiven: [],
      },
    });

    const firewallRes = firewall.process('testuser', '2023-01-01T00:00:00Z', fixture as any);
    const signalRes = signals.compute('testuser', firewallRes, '2023-01-01T00:00:00Z');

    const excludedKeys = signalRes.excludedSignals.map(s => s.key);
    expect(excludedKeys).toContain('prAcceptanceRate');
    expect(excludedKeys).toContain('changeRequestFrequency');
    expect(excludedKeys).toContain('reworkRatio');
    
    // Check quality signals in result
    const qualitySignals = signalRes.pillarSignals.QUALITY;
    const evaluableQuality = qualitySignals.filter(k => !signalRes.signals[k].excluded);
    expect(evaluableQuality.length).toBe(0);

    const baseWeights: Record<PillarKey, number> = {
      ACTIVITY: 0.2, COLLABORATION: 0.2, QUALITY: 0.2, RELIABILITY: 0.1, IMPACT: 0.2, GROWTH: 0.1
    };
    const compRes = completeness.compute(signalRes, baseWeights);
    expect(compRes.pillarEvaluability.QUALITY).toBe(false);
  });

  it('TEST B3 — Consistency validator fires', () => {
    const fixture = buildFixture({
      graphql: {
        pullRequests: Array.from({ length: 12 }).map((_, i) => ({
          mergedAt: '2024-01-01T00:00:00Z',
          repository: { owner: { login: 'other' }, name: `repo${i}` },
          reviews: {
            nodes: i < 10 ? [{ state: i < 7 ? 'CHANGES_REQUESTED' : 'APPROVED', author: { login: 'reviewer' } }] : []
          }
        })),
        contributionCalendar: { weeks: [] },
        reviewsGiven: [],
      },
    });

    const firewallRes = firewall.process('testuser', '2023-01-01T00:00:00Z', fixture as any);
    const signalRes = signals.compute('testuser', firewallRes, '2023-01-01T00:00:00Z');

    expect(signalRes.consistencyNotes.length).toBeGreaterThanOrEqual(1);
    expect(signalRes.consistencyNotes[0].toLowerCase()).toContain('unusual');
  });

  it('TEST B4 — DataCompletenessEngine LOW visibility', () => {
    // 8 of 30 signals active = ~26.6% = LOW
    const signalsMock: Record<string, any> = {};
    const pillarMapping = signals['getPillarMapping']();
    const allKeys = Object.values(pillarMapping).flat();
    
    allKeys.forEach((key, i) => {
      signalsMock[key] = {
        value: 1,
        confidence: 1,
        excluded: i >= 8 // First 8 are active
      };
    });

    const signalRes = {
      signals: signalsMock,
      excludedSignals: allKeys.slice(8).map(k => ({ key: k, reason: 'too few samples' })),
      pillarSignals: pillarMapping,
    };

    const baseWeights: Record<PillarKey, number> = {
      ACTIVITY: 0.2, COLLABORATION: 0.2, QUALITY: 0.2, RELIABILITY: 0.1, IMPACT: 0.2, GROWTH: 0.1
    };

    const result = completeness.compute(signalRes as any, baseWeights);
    expect(result.visibilityTier).toBe('LOW');
    const totalWeight = Object.values(result.rebalancedWeights).reduce((a, b) => a + b, 0);
    expect(totalWeight).toBeCloseTo(1.0, 3);
    expect(result.overallConfidenceCap).toBeNull(); // Only MINIMAL gets 0.45
  });

  it('TEST B5 — Dynamic weight rebalancing', () => {
    // SENIOR weights: Technical(Quality): 0.20, Reliability: 0.25, Collaboration: 0.35, Impact: 0.20
    const seniorBaseWeights: any = {
      QUALITY: 0.20,
      RELIABILITY: 0.25,
      COLLABORATION: 0.35,
      IMPACT: 0.20,
      ACTIVITY: 0,
      GROWTH: 0
    };

    // Exclude Collaboration
    const pillarMapping = signals['getPillarMapping']();
    const signalsMock: Record<string, any> = {};
    Object.values(pillarMapping).flat().forEach(key => {
        const pillar = Object.keys(pillarMapping).find(p => pillarMapping[p].includes(key)) as PillarKey;
        signalsMock[key] = {
            value: 0.5,
            confidence: 1,
            excluded: pillar === 'COLLABORATION'
        };
    });

    const signalRes = {
        signals: signalsMock,
        pillarSignals: pillarMapping,
    };

    const result = completeness.compute(signalRes as any, seniorBaseWeights);
    
    expect(result.rebalancedWeights.COLLABORATION).toBe(0);
    expect(result.pillarEvaluability.COLLABORATION).toBe(false);

    // Sum verification
    const totalWeight = Object.values(result.rebalancedWeights).reduce((a: number, b: number) => a + b, 0);
    expect(totalWeight).toBeCloseTo(1.0, 3);

    // Proportional verification
    // Remaining base total = 0.2 + 0.25 + 0.2 = 0.65
    // QUALITY should get: 0.20 + (0.35 * (0.20 / 0.65)) = 0.30769
    expect(result.rebalancedWeights.QUALITY).toBeCloseTo(0.30769, 4);
    // RELIABILITY should get: 0.25 + (0.35 * (0.25 / 0.65)) = 0.38461
    expect(result.rebalancedWeights.RELIABILITY).toBeCloseTo(0.38461, 4);
  });
});

// SPEC VERIFICATION RESULTS
// B1 Firewall — PASS
// B2 Minimum samples — PASS
// B3 Consistency validator — PASS
// B4 LOW visibility — PASS
// B5 Weight rebalancing — PASS
