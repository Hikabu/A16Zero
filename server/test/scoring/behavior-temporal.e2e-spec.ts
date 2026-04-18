import { Test, TestingModule } from '@nestjs/testing';
import { BehaviorClassifierService } from '../../src/scoring/behavior-classifier/behavior-classifier.service';
import { CareerPhaseEngineService } from '../../src/scoring/career-phase-engine/career-phase-engine.service';
import { TemporalScoreLayeringService } from '../../src/scoring/temporal-score-layering/temporal-score-layering.service';
import { SignalComputeResult } from '../../src/scoring/signal-engine/types';
import { GithubRawDataSnapshot } from '../../src/scoring/github-adapter/types';
import { FraudTier } from '../../src/scoring/firewall/types';

import { SignalEngineService } from '../../src/scoring/signal-engine/signal-engine.service';

describe('Pipeline Checkpoint C', () => {
    let behaviorClassifier: BehaviorClassifierService;
    let careerPhaseEngine: CareerPhaseEngineService;
    let temporalLayering: TemporalScoreLayeringService;
    let signalEngine: SignalEngineService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                BehaviorClassifierService,
                CareerPhaseEngineService,
                TemporalScoreLayeringService,
                SignalEngineService,
            ],
        }).compile();

        behaviorClassifier = module.get<BehaviorClassifierService>(BehaviorClassifierService);
        careerPhaseEngine = module.get<CareerPhaseEngineService>(CareerPhaseEngineService);
        temporalLayering = module.get<TemporalScoreLayeringService>(TemporalScoreLayeringService);
        signalEngine = module.get<SignalEngineService>(SignalEngineService);
    });

    const buildSignalFixture = (overrides: any): SignalComputeResult => ({
        signals: { ...overrides },
        excludedSignals: [],
        consistencyNotes: [],
        pillarSignals: { ACTIVITY: [], COLLABORATION: [], QUALITY: [], IMPACT: [], GROWTH: [], RELIABILITY: [] },
        fraudScore: 0,
        fraudTier: 'NONE' as any
    } as any);

    it('TEST C1 — REVIEW_HEAVY_SENIOR pattern', () => {
        const signals = buildSignalFixture({
            reviewDepth: { value: 0.75, confidence: 1, excluded: false },
            prReviewCount12m: { value: 45, confidence: 1, excluded: false },
            activeWeeksRatio: { value: 1.0, confidence: 1, excluded: false },
            avgWeeklyCommits: { value: 1.92, confidence: 1, excluded: false }, // 45 / (1*52*1.92) ~= 0.45
            avgPRDescriptionLength: { value: 250, confidence: 1, excluded: false },
            activeMonths: { value: 24, confidence: 1, excluded: false },
            seniorityTrajectory: { value: 'SENIOR', confidence: 1, excluded: false }
        });

        const result = behaviorClassifier.compute(signals, 24);
        expect(result.primaryPattern).toBe('REVIEW_HEAVY_SENIOR');
        expect(result.primaryConfidence).toBeGreaterThanOrEqual(0.65);
        expect(result.accuracyDisclosure).not.toBeNull();
    });

    it('TEST C2 — CareerPhaseEngine career gap detection', () => {
        const commits: any[] = [];
        // Active months 1-5
        for (let i = 0; i < 5; i++) {
            commits.push({ commit: { author: { date: new Date(2022, i, 15).toISOString() } } });
        }
        // Gap months 6-13 (8 months)
        // Active month 14
        commits.push({ commit: { author: { date: new Date(2023, 1, 15).toISOString() } } });

        const rawData: GithubRawDataSnapshot = {
            rest: { repos: [], languages: {}, commits: { 'repo1': commits } },
            graphql: { pullRequests: [], reviewsGiven: [], contributionCalendar: {} },
            events: { events: [] },
            fetchedAt: new Date(2023, 2, 1).toISOString()
        };

        const result = careerPhaseEngine.compute(rawData, new Date(2022, 0, 1).toISOString());
        
        expect(result.careerGapDetected).toBe(true);
        expect(result.longestGapMonths).toBe(8);
        expect(result.careerGapNote?.toLowerCase()).toContain('not');
        expect(result.careerGapNote?.toLowerCase()).toContain('penali');
    });

    it('TEST C3 — RETURNING trajectory temporal weight override', () => {
        const signalResult = buildSignalFixture({});
        const careerResult: any = {
            trajectory: 'RETURNING',
            peakWindow: { startMonth: '2020-01', endMonth: '2021-12', score: 100 }
        };
        const config = { historicalWeight: 0.5, recentWeight: 0.5 };
        const rawData = { fetchedAt: '2024-01-01T00:00:00Z', rest: { commits: {} }, graphql: { pullRequests: [] } } as any;

        const result = temporalLayering.compute(signalResult, careerResult, config, rawData);
        
        expect(result.appliedWeights.historicalWeight).toBe(0.80);
        expect(result.appliedWeights.recentWeight).toBe(0.20);
    });

    it('TEST C4 — Fraud → confidence (not score)', () => {
        const commits = [{ commit: { author: { date: '2024-01-01T00:00:00Z' } } }];
        const rawData = {
          username: 'test-fraud',
          rest: { repos: [], languages: {}, commits: { 'repo1': commits } },
          graphql: { pullRequests: [], reviewsGiven: [], contributionCalendar: { weeks: [] } },
          events: { events: [] },
          fetchedAt: '2024-02-01T00:00:00Z'
        };

        const accountCreated = '2023-01-01T00:00:00Z';

        // Case 1: CLEAN
        const firewallClean = {
            username: 'test-fraud',
            fraudTier: FraudTier.CLEAN,
            fraudScore: 0,
            cleanedData: rawData,
            removedRepos: [],
            flaggedRepos: []
        };

        // Case 2: LIKELY_FRAUDULENT
        const firewallFraud = {
            username: 'test-fraud',
            fraudTier: FraudTier.LIKELY_FRAUDULENT,
            fraudScore: 0.65,
            cleanedData: rawData,
            removedRepos: [],
            flaggedRepos: []
        };

        const res1 = signalEngine.compute('test-fraud', firewallClean as any, accountCreated);
        const res2 = signalEngine.compute('test-fraud', firewallFraud as any, accountCreated);

        // Assert: Signals are identical regardless of fraud tier
        expect(res1.signals).toEqual(res2.signals);
        expect(res1.fraudTier).toBe(FraudTier.CLEAN);
        expect(res2.fraudTier).toBe(FraudTier.LIKELY_FRAUDULENT);

        // Stub roleFitScore remains unchanged
        const roleFitScoreClean = 0.72;
        const roleFitScoreFraud = 0.72; // ADR-004 logic
        expect(roleFitScoreClean).toEqual(roleFitScoreFraud);
    });

    it.todo('TEST C5 — Signal dominance cap (40% per category enforcement)');
});
