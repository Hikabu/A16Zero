import { Test, TestingModule } from '@nestjs/testing';
import { BehaviorClassifierService } from './behavior-classifier.service';
import { BehaviorPattern } from './types';
import { SignalComputeResult, SignalValue } from '../signal-engine/types';

describe('BehaviorClassifierService', () => {
  let service: BehaviorClassifierService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BehaviorClassifierService],
    }).compile();

    service = module.get<BehaviorClassifierService>(BehaviorClassifierService);
  });

  const mockSignal = (value: any): SignalValue => ({
    value,
    confidence: 1,
    excluded: false,
  });

  const buildResultMock = (overrides: Record<string, any> = {}): SignalComputeResult => {
    const baseSignals = {
      activeMonths: mockSignal(24),
      avgWeeklyCommits: mockSignal(10),
      activeWeeksRatio: mockSignal(0.5),
      reviewDepth: mockSignal(0.1),
      prReviewCount12m: mockSignal(0),
      commitConsistencyScore: mockSignal(0.5),
      externalPrRatio: mockSignal(0.1),
      highPrestigeRepoContributions: mockSignal(0),
      seniorityTrajectory: mockSignal(null),
    };

    const signals = { ...baseSignals };
    for (const key of Object.keys(overrides)) {
      const val = overrides[key];
      (signals as any)[key] = (val && typeof val === 'object' && 'value' in val) ? val : mockSignal(val);
    }

    return {
      signals: signals as any,
      excludedSignals: [],
      consistencyNotes: [],
      pillarSignals: {} as any,
      fraudScore: 0,
      fraudTier: 'CLEAR',
    };
  };

  it('EARLY_CAREER: should match regardless of other signals if account age < 18m', () => {
    const results = buildResultMock({
      reviewDepth: 0.8, // Would be senior
      prReviewCount12m: 50,
      avgWeeklyCommits: 5,
    });
    const result = service.compute(results, 12); // 12 months account age
    expect(result.primaryPattern).toBe(BehaviorPattern.EARLY_CAREER);
    expect(result.primaryConfidence).toBeGreaterThanOrEqual(0.7);
  });

  it('REVIEW_HEAVY_SENIOR: should match high review depth and review/commit ratio', () => {
    const results = buildResultMock({
      activeMonths: 36,
      reviewDepth: 0.75,
      prReviewCount12m: 20, // 20 reviews
      activeWeeksRatio: 1.0, // 52 weeks active
      avgWeeklyCommits: 1, // 52 commits total
      // Ratio = 20 / (52 * 1) = 0.38... wait, need 0.4
    });
    
    // Adjust to hit > 0.4
    results.signals['prReviewCount12m'] = mockSignal(30); 
    // Ratio = 30 / 52.001 = 0.57
    
    const result = service.compute(results, 48);
    expect(result.primaryPattern).toBe(BehaviorPattern.REVIEW_HEAVY_SENIOR);
    expect(result.primaryConfidence).toBe(0.72);
  });

  it('RETURNING_DEVELOPER: should match gap + historical strength + seniorityTrajectory', () => {
    const results = buildResultMock({
      activeMonths: 60,
      seniorityTrajectory: mockSignal('RETURNING'),
    });
    const careerPhase = { careerGapDetected: true, historicalStrength: 70 };
    const result = service.compute(results, 72, careerPhase);
    expect(result.primaryPattern).toBe(BehaviorPattern.RETURNING_DEVELOPER);
  });

  it('OSS_COLLABORATOR: should match high external ratio + prestige + reviews', () => {
    const results = buildResultMock({
      activeMonths: 48,
      externalPrRatio: 0.6,
      highPrestigeRepoContributions: 5,
      prReviewCount12m: 15,
    });
    const result = service.compute(results, 60);
    expect(result.primaryPattern).toBe(BehaviorPattern.OSS_COLLABORATOR);
    expect(result.primaryConfidence).toBe(0.8);
  });

  it('COMMIT_HEAVY_MIDLEVEL: should match consistency and mid-level collab', () => {
    const results = buildResultMock({
      activeMonths: 48,
      commitConsistencyScore: 0.7,
      reviewDepth: 0.2,
      externalPrRatio: 0.25,
    });
    const result = service.compute(results, 60);
    expect(result.primaryPattern).toBe(BehaviorPattern.COMMIT_HEAVY_MIDLEVEL);
  });

  it('BALANCED_CONTRIBUTOR: fallback when criteria met', () => {
    const results = buildResultMock({
      activeMonths: 48,
      commitConsistencyScore: 0.45,
      reviewDepth: 0.35,
      externalPrRatio: 0.15,
    });
    const result = service.compute(results, 60);
    expect(result.primaryPattern).toBe(BehaviorPattern.BALANCED_CONTRIBUTOR);
  });

  it('Sparse data: default to COMMIT_HEAVY_MIDLEVEL with low confidence', () => {
    const results = buildResultMock({
      activeMonths: 24,
      commitConsistencyScore: 0.1, // Very low
      reviewDepth: 0.1,
      externalPrRatio: 0.05,
    });
    const result = service.compute(results, 30);
    expect(result.primaryPattern).toBe(BehaviorPattern.COMMIT_HEAVY_MIDLEVEL);
    expect(result.primaryConfidence).toBe(0.45);
  });

  it('Secondary Pattern: should identify highest non-primary pattern', () => {
    const results = buildResultMock({
      activeMonths: 48,
      externalPrRatio: 0.6, // High OSS
      highPrestigeRepoContributions: 5,
      prReviewCount12m: 15,
      commitConsistencyScore: 0.8, // Also high Midlevel consistency
      reviewDepth: 0.1, // Low review depth disqualifies Senior/Balanced
    });
    // This hits OSS_COLLABORATOR first (Priority)
    // Then checks others. COMMIT_HEAVY_MIDLEVEL matches (consistency 0.8, depth 0.1, ext 0.6 >= 0.2)
    const result = service.compute(results, 60);
    expect(result.primaryPattern).toBe(BehaviorPattern.OSS_COLLABORATOR);
    expect(result.secondaryPattern).toBe(BehaviorPattern.COMMIT_HEAVY_MIDLEVEL);
  });

  it('Accuracy disclosure should always be present', () => {
    const results = buildResultMock();
    const result = service.compute(results, 24);
    expect(result.accuracyDisclosure).not.toBeNull();
    expect(result.accuracyDisclosure).toContain('Rule-based');
  });
});
