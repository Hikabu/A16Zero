import { Test, TestingModule } from '@nestjs/testing';
import { SignalComputeProcessor } from './signal-compute.processor';
import { PrismaService } from '../prisma/prisma.service';
import { FirewallService } from '../scoring/firewall/firewall.service';
import { SignalEngineService } from '../scoring/signal-engine/signal-engine.service';
import { EcosystemNormaliserService } from '../scoring/ecosystem-normaliser/ecosystem-normaliser.service';
import { PercentileCalculatorService } from '../scoring/percentile-calculator/percentile-calculator.service';
import { DataCompletenessEngineService } from '../scoring/data-completeness-engine/data-completeness-engine.service';
import { ConfidenceEnvelopeService } from '../scoring/confidence-envelope/confidence-envelope.service';
import { PrivacyAdjustmentEngineService } from '../scoring/privacy-adjustment-engine/privacy-adjustment-engine.service';
import { BehaviorClassifierService } from '../scoring/behavior-classifier/behavior-classifier.service';
import { CareerPhaseEngineService } from '../scoring/career-phase-engine/career-phase-engine.service';
import { TemporalScoreLayeringService } from '../scoring/temporal-score-layering/temporal-score-layering.service';
import { CapabilityTranslatorService } from '../scoring/capability-translator/capability-translator.service';
import { DeveloperSnapshotBuilderService } from '../scoring/developer-snapshot-builder/developer-snapshot-builder.service';
import { CareerTimelineReconstructorService } from '../scoring/career-timeline-reconstructor/career-timeline-reconstructor.service';
import { ClaimGeneratorService } from '../scoring/claim-generator/claim-generator.service';
import { RiskLevel } from '@prisma/client';

describe('SignalComputeProcessor', () => {
  let processor: SignalComputeProcessor;
  let prisma: PrismaService;

  const mockPrisma = {
    githubProfile: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(mockPrisma)),
    candidateSignals: {
      upsert: jest.fn(),
    },
    developerSnapshot: {
      upsert: jest.fn(),
    },
    careerTimeline: {
      upsert: jest.fn(),
    },
    candidateClaim: {
      updateMany: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockService = (methods: string[]) => {
    const s = {};
    methods.forEach(m => s[m] = jest.fn());
    return s;
  };

  const firewall = mockService(['process']);
  const signalEngine = mockService(['compute']);
  const normaliser = mockService(['normalise']);
  const percentileCalculator = mockService(['calculate']);
  const dataCompleteness = mockService(['compute']);
  const confidenceEnvelope = mockService(['enforceSignalDominanceCap', 'buildEnvelope']);
  const privacyAdjustment = mockService(['compute']);
  const behaviorClassifier = mockService(['compute']);
  const careerPhase = mockService(['compute']);
  const temporalScore = mockService(['compute']);
  const capabilityTranslator = mockService(['translate']);
  const snapshotBuilder = mockService(['build']);
  const timelineReconstructor = mockService(['build']);
  const claimGenerator = mockService(['generate']);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SignalComputeProcessor,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FirewallService, useValue: firewall },
        { provide: SignalEngineService, useValue: signalEngine },
        { provide: EcosystemNormaliserService, useValue: normaliser },
        { provide: PercentileCalculatorService, useValue: percentileCalculator },
        { provide: DataCompletenessEngineService, useValue: dataCompleteness },
        { provide: ConfidenceEnvelopeService, useValue: confidenceEnvelope },
        { provide: PrivacyAdjustmentEngineService, useValue: privacyAdjustment },
        { provide: BehaviorClassifierService, useValue: behaviorClassifier },
        { provide: CareerPhaseEngineService, useValue: careerPhase },
        { provide: TemporalScoreLayeringService, useValue: temporalScore },
        { provide: CapabilityTranslatorService, useValue: capabilityTranslator },
        { provide: DeveloperSnapshotBuilderService, useValue: snapshotBuilder },
        { provide: CareerTimelineReconstructorService, useValue: timelineReconstructor },
        { provide: ClaimGeneratorService, useValue: claimGenerator },
      ],
    }).compile();

    processor = module.get<SignalComputeProcessor>(SignalComputeProcessor);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should execute the full 18-step orchestration and persist results', async () => {
    // 1. Setup Data
    const mockProfile = {
      id: 'prof_123',
      devCandidateId: 'cand_456',
      githubUsername: 'testuser',
      createdAt: new Date('2023-01-01'),
      rawDataSnapshot: {
        rest: { repos: [], languages: {}, commits: {} },
        graphql: { pullRequests: [], reviewsGiven: [], contributionCalendar: {} },
        events: { events: [] },
        fetchedAt: new Date().toISOString(),
      },
    };

    mockPrisma.githubProfile.findUnique.mockResolvedValue(mockProfile);

    // 2. Mock Service Responses
    firewall['process'].mockReturnValue({ cleanedData: {} });
    signalEngine['compute'].mockReturnValue({
      signals: {
        activeWeeksRatio: { value: 0.8 },
        commitConsistencyScore: { value: 0.75 },
        prThroughput90d: { value: 5 },
        reviewDepth: { value: 0.6 },
        prAcceptanceRate: { value: 0.9, excluded: false },
        changeRequestFrequency: { value: 0.1 },
        reworkRatio: { value: 0.05 },
        testFilePresence: { value: true },
        cicdConfigDetection: { value: true },
        starsOnOriginalRepos: { value: 10 },
        highPrestigeRepoContributions: { value: true },
        newLanguagesAdopted1yr: { value: 2 },
        seniorityTrajectory: { value: 0.8 },
        privateOrgActivity: { value: true },
        coreProtocolPrMerges: { value: 1 },
        securityKeywordReviewDepth: { value: 0.5 },
        prestigeForkToPrRatio: { value: 0.2 },
        languageEvolutionTrajectory: { value: 0.7 },
      },
      fraudScore: 0,
      fraudTier: 'CLEAN',
      languageDistribution: { TypeScript: 100 },
      excludedSignals: [],
      consistencyNotes: [],
    });
    dataCompleteness['compute'].mockReturnValue({ dataCoveragePercent: 90, visibilityTier: 'FULL', rebalancedWeights: {} });
    privacyAdjustment['compute'].mockReturnValue({ verifiedPrivateMonths: 2 });
    careerPhase['compute'].mockReturnValue({ careerGapDetected: false, trajectory: 'STABLE', peakWindow: { score: 100 } });
    behaviorClassifier['compute'].mockReturnValue({ primaryPattern: 'BALANCED_CONTRIBUTOR', hrDescription: 'desc' });
    normaliser['normalise'].mockReturnValue({ assignedCohort: 'typescript-node', normalisedSignals: {} });
    temporalScore['compute'].mockReturnValue({ compositeScore: 0.85 });
    percentileCalculator['calculate'].mockResolvedValue({ ecosystemPercentile: 95, ecosystemPercentileLabel: 'Top 5%' });
    confidenceEnvelope['enforceSignalDominanceCap'].mockReturnValue({});
    confidenceEnvelope['buildEnvelope'].mockReturnValue({ overallConfidence: 0.9, riskLevel: RiskLevel.LOW_RISK, caveats: [] });
    capabilityTranslator['translate'].mockReturnValue({ capabilityStatements: [], gapStatements: [] });

    // 3. Execution
    await processor.process({ data: { candidateId: 'cand_456', githubProfileId: 'prof_123' } } as any);

    // 4. Verification
    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockPrisma.candidateSignals.upsert).toHaveBeenCalled();
    expect(snapshotBuilder['build']).toHaveBeenCalled();
    expect(timelineReconstructor['build']).toHaveBeenCalled();
    expect(claimGenerator['generate']).toHaveBeenCalled();

    // Check mapping logic (one sample)
    const signalCall = mockPrisma.candidateSignals.upsert.mock.calls[0][0];
    expect(signalCall.create.ecosystemCohort).toBe('typescript-node');
    expect(signalCall.create.ecosystemPercentile).toBe(95);
  });
});
