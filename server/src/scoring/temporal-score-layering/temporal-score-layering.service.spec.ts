import { TemporalScoreLayeringService } from './temporal-score-layering.service';
import { CareerPhaseResult } from '../career-phase-engine/types';
import { GithubRawDataSnapshot } from '../github-adapter/types';
import { SignalComputeResult } from '../signal-engine/types';

describe('TemporalScoreLayeringService', () => {
  let service: TemporalScoreLayeringService;

  beforeEach(() => {
    service = new TemporalScoreLayeringService();
  });

  const buildData = (commits: any[] = []): GithubRawDataSnapshot => ({
    rest: {
      repos: [],
      languages: {},
      commits: { 'repo1': commits }
    },
    graphql: {
      pullRequests: [],
      reviewsGiven: [],
      contributionCalendar: {}
    },
    events: { events: [] },
    fetchedAt: '2024-01-01T00:00:00Z'
  });

  const mockSignalResult: SignalComputeResult = {
    signals: {} as any,
    excludedSignals: [],
    consistencyNotes: [],
    pillarSignals: { ACTIVITY: [], COLLABORATION: [], QUALITY: [], IMPACT: [], GROWTH: [], RELIABILITY: [] },
    fraudScore: 0,
    fraudTier: 'NONE' as any
  };

  const mockCareerPhase: CareerPhaseResult = {
    phases: [],
    gapEvents: [],
    careerGapDetected: false,
    longestGapMonths: 0,
    careerGapNote: null,
    peakWindow: { startMonth: '2020-01', endMonth: '2021-12', score: 100 },
    trajectory: 'STABLE'
  };

  it('should calculate weighted composite score correctly', () => {
    // Peak window activity - 20 commits over 20 different weeks
    const commits: any[] = [];
    for (let i = 0; i < 20; i++) {
        const d = new Date(2021, 0, 1 + (i * 7));
        commits.push({ commit: { author: { date: d.toISOString() } } });
    }
    // Recent activity (none)

    const data = buildData(commits);
    const config = { historicalWeight: 0.6, recentWeight: 0.4 };
    
    const result = service.compute(mockSignalResult, mockCareerPhase, config, data);

    expect(result.peakCareerScore).toBeGreaterThan(0);
    expect(result.recentActivityScore).toBe(0);
    expect(result.compositeScore).toBe(Number((result.peakCareerScore * 0.6).toFixed(2)));
  });

  it('should override weights for RETURNING trajectory', () => {
    const returningPhase = { ...mockCareerPhase, trajectory: 'RETURNING' as const };
    const config = { historicalWeight: 0.5, recentWeight: 0.5 };
    const data = buildData([]);

    const result = service.compute(mockSignalResult, returningPhase, config, data);

    expect(result.appliedWeights.historicalWeight).toBe(0.80);
    expect(result.appliedWeights.recentWeight).toBe(0.20);
    expect(result.isTrajectoryOverridden).toBe(true);
  });
});
