import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
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
import { GithubRawDataSnapshot } from '../scoring/github-adapter/types';
import { PillarKey } from '../scoring/signal-engine/types';
import { FraudTier, SyncStatus } from '@prisma/client';
import { AnalysisResult } from '../scoring/types/result.types';
import { env } from '../shared/config/env.schema';

@Processor('signal-compute', { concurrency: 10 })
export class SignalComputeProcessor extends WorkerHost {
  private readonly logger = new Logger(SignalComputeProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly firewall: FirewallService,
    private readonly signalEngine: SignalEngineService,
    private readonly normaliser: EcosystemNormaliserService,
    private readonly percentileCalculator: PercentileCalculatorService,
    private readonly dataCompleteness: DataCompletenessEngineService,
    private readonly confidenceEnvelope: ConfidenceEnvelopeService,
    private readonly privacyAdjustment: PrivacyAdjustmentEngineService,
    private readonly behaviorClassifier: BehaviorClassifierService,
    private readonly careerPhase: CareerPhaseEngineService,
    private readonly temporalScore: TemporalScoreLayeringService,
    private readonly capabilityTranslator: CapabilityTranslatorService,
    private readonly snapshotBuilder: DeveloperSnapshotBuilderService,
    private readonly timelineReconstructor: CareerTimelineReconstructorService,
    private readonly claimGenerator: ClaimGeneratorService,
  ) {
    super();
  }

  async process(job: Job<{ candidateId: string; githubProfileId: string }>): Promise<AnalysisResult | void> {
    const { githubProfileId } = job.data;
    this.logger.log(`Starting full signal pipeline for profile ${githubProfileId}`);

    const profile = await this.prisma.githubProfile.findUnique({
      where: { id: githubProfileId },
      include: { devCandidate: true },
    });

    if (!profile || !profile.rawDataSnapshot) {
      throw new Error(`GithubProfile ${githubProfileId} not found or has no data snapshot`);
    }

    const rawData = profile.rawDataSnapshot as unknown as GithubRawDataSnapshot;
    const accountCreatedAt = profile.createdAt.toISOString();

    try {
      // (a) Set stage: analyzing_projects (60%)
      await this.prisma.githubProfile.update({
        where: { id: githubProfileId },
        data: {
          syncProgress: JSON.stringify({ stage: 'analyzing_projects', percent: 60 }),
        },
      });

      if (env.LEGACY_SCORING === true) {
        this.logger.log(`Running LEGACY scoring pipeline for profile ${githubProfileId}`);
        return this.runLegacyPipeline(githubProfileId, profile, rawData, accountCreatedAt);
      }

      this.logger.log(`Running REFACTORED scoring pipeline (placeholder) for profile ${githubProfileId}`);
      
      // Placeholder for new pipeline - Phase 2-4 implementation will go here
      const result = this.buildPlaceholderResult();

      // (b) Set stage: building_profile (85%)
      await this.prisma.githubProfile.update({
        where: { id: githubProfileId },
        data: {
          syncProgress: JSON.stringify({ stage: 'building_profile', percent: 85 }),
        },
      });

      // (c) Persistence logic for new pipeline will be added in Phase 3
      // For now, we update the status to DONE
      await this.prisma.githubProfile.update({
        where: { id: githubProfileId },
        data: {
          syncStatus: SyncStatus.DONE,
          syncProgress: JSON.stringify({ stage: 'complete', percent: 100 }),
        },
      });

      return result;

    } catch (error) {
      this.logger.error(`Pipeline failed for profile ${githubProfileId}: ${error.stack}`);
      throw error;
    }
  }

  private async runLegacyPipeline(
    githubProfileId: string, 
    profile: any, 
    rawData: GithubRawDataSnapshot, 
    accountCreatedAt: string
  ): Promise<void> {
    // 1-3. Firewall & Signal Engine
    const firewallResult = this.firewall.process(profile.githubUsername, accountCreatedAt, rawData);
    const engineResult = this.signalEngine.compute(profile.githubUsername, firewallResult, accountCreatedAt);

    // 4-5. Completeness & Privacy
    const defaultWeights: Record<PillarKey, number> = {
      ACTIVITY: 0.20,
      COLLABORATION: 0.20,
      QUALITY: 0.20,
      RELIABILITY: 0.10,
      IMPACT: 0.15,
      GROWTH: 0.15,
    };
    const completenessResult = this.dataCompleteness.compute(engineResult, defaultWeights);
    const privacyResult = this.privacyAdjustment.compute(rawData.events);

    // 6-7. Behavior & Career Phase
    const accountAgeMonths = this.calculateAccountAgeMonths(profile.createdAt);
    const phaseResult = this.careerPhase.compute(rawData, accountCreatedAt);
    const behaviorResult = this.behaviorClassifier.compute(engineResult, accountAgeMonths, {
      careerGapDetected: phaseResult.careerGapDetected,
      historicalStrength: phaseResult.peakWindow.score, // Simple mapping for MVP
    });

    // 8-10. Normalization, Layering, Percentiles
    const ecosystemResult = this.normaliser.normalise(engineResult);
    const temporalResult = this.temporalScore.compute(engineResult, phaseResult, { historicalWeight: 0.4, recentWeight: 0.6 }, rawData);
    const percentileResult = await this.percentileCalculator.calculate(
      ecosystemResult.assignedCohort,
      ecosystemResult.normalisedSignals,
    );

    // 11-12. Confidence & Dominance Capping
    const effectiveWeights = this.confidenceEnvelope.enforceSignalDominanceCap(completenessResult.rebalancedWeights);
    const confidenceResult = this.confidenceEnvelope.buildEnvelope({
      dataCoveragePercent: completenessResult.dataCoveragePercent,
      visibilityTier: completenessResult.visibilityTier,
      overallConfidenceCap: completenessResult.overallConfidenceCap,
      fraudTier: engineResult.fraudTier as any,
      fraudScore: engineResult.fraudScore,
      excludedSignals: engineResult.excludedSignals,
      consistencyNotes: engineResult.consistencyNotes,
      privateWorkNote: completenessResult.completenessNote,
      signalCount: Object.keys(engineResult.signals).length,
    });

    // (b) Set stage: building_profile (85%) - in legacy path
    await this.prisma.githubProfile.update({
      where: { id: githubProfileId },
      data: {
        syncProgress: JSON.stringify({ stage: 'building_profile', percent: 85 }),
      },
    });

    // 13. Capability Translation
    const translationResult = this.capabilityTranslator.translate(engineResult, behaviorResult, confidenceResult);

    // 14-17. Persistence (Transaction)
    const ROLE_FIT_STUB = temporalResult.compositeScore; 

    await this.prisma.$transaction(async (tx) => {
      // A. Update Signals
      await tx.candidateSignals.upsert({
        where: { devCandidateId: profile.devCandidateId },
        create: this.mapSignalData(profile.devCandidateId, engineResult, ecosystemResult, percentileResult, confidenceResult, effectiveWeights, completenessResult),
        update: this.mapSignalData(profile.devCandidateId, engineResult, ecosystemResult, percentileResult, confidenceResult, effectiveWeights, completenessResult),
      });

      // B. Build Snapshot
      await this.snapshotBuilder.build({
        devCandidateId: profile.devCandidateId,
        behaviorResult,
        confidenceEnvelope: confidenceResult,
        ecosystemResult,
        capabilityStatements: translationResult.capabilityStatements,
        roleFitScore: ROLE_FIT_STUB,
      }, tx);

      // C. Build Timeline
      await this.timelineReconstructor.build({
        devCandidateId: profile.devCandidateId,
        careerPhaseResult: phaseResult,
        ecosystemResult,
        privacyResult,
        signalResult: engineResult,
        behaviorResult,
      }, tx);

      // D. Generate Claims
      await this.claimGenerator.generate({
        devCandidateId: profile.devCandidateId,
        capabilityStatements: translationResult.capabilityStatements,
        signalResult: engineResult,
      }, tx);
    });

    // (c) Set status = DONE, complete (100%)
    await this.prisma.githubProfile.update({
      where: { id: githubProfileId },
      data: {
        syncStatus: SyncStatus.DONE,
        syncProgress: JSON.stringify({ stage: 'complete', percent: 100 }),
      },
    });

    this.logger.log(`Full computation pipeline completed for devCandidate ${profile.devCandidateId}`);
  }

  private buildPlaceholderResult(): AnalysisResult {
    return {
      summary: 'Placeholder summary for the refactored scoring engine.',
      capabilities: {
        backend: { score: 0, confidence: 'low' },
        frontend: { score: 0, confidence: 'low' },
        devops: { score: 0, confidence: 'low' },
      },
      ownership: {
        ownedProjects: 0,
        activelyMaintained: 0,
        confidence: 'low',
      },
      impact: {
        activityLevel: 'low',
        consistency: 'sparse',
        externalContributions: 0,
        confidence: 'low',
      },
    };
  }

  private calculateAccountAgeMonths(createdAt: Date): number {
    const diff = new Date().getTime() - createdAt.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 30.44));
  }

  private mapSignalData(
    devCandidateId: string,
    engineResult: any,
    ecosystemResult: any,
    percentileResult: any,
    confidenceResult: any,
    effectiveWeights: any,
    completenessResult: any,
  ): any {
    return {
      devCandidateId,
      computedAt: new Date(),
      fraudScore: engineResult.fraudScore,
      fraudTier: this.mapFraudTier(engineResult.fraudTier),
      ecosystemCohort: ecosystemResult.assignedCohort,
      ecosystemPercentile: percentileResult.ecosystemPercentile,
      percentileLabel: percentileResult.ecosystemPercentileLabel,
      languageDistribution: engineResult.languageDistribution,
      dataCoveragePercent: confidenceResult.scoreWithheld ? 0 : engineResult.signals.activeWeeksRatio ? (completenessResult.dataCoveragePercent) : 0, 
      effectivePillarWeights: effectiveWeights,
      confidenceTier: confidenceResult.confidenceTier,
      riskLevel: confidenceResult.riskLevel,
      confidenceScore: confidenceResult.overallConfidence,
      confidenceCaveats: confidenceResult.caveats,
      activeWeeksRatio: engineResult.signals.activeWeeksRatio?.value ?? 0,
      commitConsistencyScore: engineResult.signals.commitConsistencyScore?.value ?? 0,
      prThroughput90d: engineResult.signals.prThroughput90d?.value ?? 0,
      reviewDepth: engineResult.signals.reviewDepth?.value ?? 0,
      prAcceptanceRate: engineResult.signals.prAcceptanceRate?.value ?? 0,
      changeRequestFrequency: engineResult.signals.changeRequestFrequency?.value ?? 0,
      reworkRatio: engineResult.signals.reworkRatio?.value ?? 0,
      testPresenceScore: engineResult.signals.testFilePresence?.value ? 1.0 : 0.0,
      cicdScore: engineResult.signals.cicdConfigDetection?.value ? 1.0 : 0.0,
      starsOnOriginalRepos: engineResult.signals.starsOnOriginalRepos?.value ?? 0,
      highPrestigeRepoContributions: engineResult.signals.highPrestigeRepoContributions?.value ? 1 : 0,
      newLanguagesAdopted: engineResult.signals.newLanguagesAdopted1yr?.value ?? 0,
      growthTrajectoryScore: engineResult.signals.seniorityTrajectory?.value ?? 0,
      privateOrgActivity: engineResult.signals.privateOrgActivity?.value ?? false,
      web3Signals: {
        coreProtocolPrMerges: engineResult.signals.coreProtocolPrMerges?.value ?? 0,
        securityKeywordReviewDepth: engineResult.signals.securityKeywordReviewDepth?.value ?? 0,
        prestigeForkToPrRatio: engineResult.signals.prestigeForkToPrRatio?.value ?? 0,
        languageEvolutionTrajectory: engineResult.signals.languageEvolutionTrajectory?.value ?? 0,
      },
    };
  }

  private mapFraudTier(tier: string): FraudTier {
    switch (tier) {
      case 'CLEAN': return FraudTier.CLEAN;
      case 'SUSPICIOUS': return FraudTier.FLAGGED;
      case 'LIKELY_FRAUDULENT': return FraudTier.DISQUALIFIED;
      default: return FraudTier.CLEAN;
    }
  }
}
