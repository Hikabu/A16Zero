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
import { GithubRawDataSnapshot } from '../scoring/github-adapter/types';
import { PillarKey } from '../scoring/signal-engine/types';
import { FraudTier } from '@prisma/client';

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
  ) {
    super();
  }

  async process(job: Job<{ candidateId: string; githubProfileId: string }>): Promise<any> {
    const { githubProfileId } = job.data;
    this.logger.log(`Starting signal computation for profile ${githubProfileId}`);

    const profile = await this.prisma.githubProfile.findUnique({
      where: { id: githubProfileId },
      include: { devCandidate: true },
    });

    if (!profile || !profile.rawDataSnapshot) {
      throw new Error(`GithubProfile ${githubProfileId} not found or has no data snapshot`);
    }

    const rawData = profile.rawDataSnapshot as unknown as GithubRawDataSnapshot;

    try {
      // 1. Run Firewall
      const firewallResult = this.firewall.process(
        profile.githubUsername,
        profile.createdAt.toISOString(),
        rawData
      );

      // 2. Compute Signals
      const engineResult = this.signalEngine.compute(
        profile.githubUsername,
        firewallResult,
        profile.createdAt.toISOString()
      );

      // 3. Normalise & Calculate Percentiles
      const normResult = this.normaliser.normalise(engineResult);
      const percResult = await this.percentileCalculator.calculate(normResult.assignedCohort, normResult.normalisedSignals);

      // 4. Data Completeness & Confidence Envelope
      const defaultWeights: Record<PillarKey, number> = {
        ACTIVITY: 0.20,
        COLLABORATION: 0.20,
        QUALITY: 0.20,
        RELIABILITY: 0.10,
        IMPACT: 0.15,
        GROWTH: 0.15,
      };

      const completenessResult = this.dataCompleteness.compute(engineResult, defaultWeights);
      const effectiveWeights = this.confidenceEnvelope.enforceSignalDominanceCap(completenessResult.rebalancedWeights);

      const confidenceEnvelopeInput = {
        dataCoveragePercent: completenessResult.dataCoveragePercent,
        visibilityTier: completenessResult.visibilityTier,
        overallConfidenceCap: completenessResult.overallConfidenceCap,
        fraudTier: engineResult.fraudTier as any, // Using domain FraudTier
        fraudScore: engineResult.fraudScore,
        excludedSignals: engineResult.excludedSignals,
        consistencyNotes: engineResult.consistencyNotes,
        privateWorkNote: completenessResult.completenessNote,
        signalCount: Object.keys(engineResult.signals).length,
      };

      const confidenceResult = this.confidenceEnvelope.buildEnvelope(confidenceEnvelopeInput);

      // 5. Update Database
      const signalData: any = {
        computedAt: new Date(),
        fraudScore: engineResult.fraudScore,
        fraudTier: this.mapFraudTier(engineResult.fraudTier),
        
        // Ecosystem & Percentile
        ecosystemCohort: normResult.assignedCohort,
        ecosystemPercentile: percResult.ecosystemPercentile,
        percentileLabel: percResult.ecosystemPercentileLabel,
        languageDistribution: engineResult.languageDistribution,

        // Completeness & Confidence
        dataCoveragePercent: confidenceResult.scoreWithheld ? 0 : completenessResult.dataCoveragePercent,
        effectivePillarWeights: effectiveWeights,
        confidenceTier: confidenceResult.confidenceTier,
        riskLevel: confidenceResult.riskLevel,
        confidenceScore: confidenceResult.overallConfidence,
        confidenceCaveats: confidenceResult.caveats,

        // Map individual signals
        activeWeeksRatio: engineResult.signals.activeWeeksRatio.value,
        commitConsistencyScore: engineResult.signals.commitConsistencyScore.value,
        prThroughput90d: engineResult.signals.prThroughput90d.value,
        reviewDepth: engineResult.signals.reviewDepth.value,
        prAcceptanceRate: engineResult.signals.prAcceptanceRate.value,
        changeRequestFrequency: engineResult.signals.changeRequestFrequency.value,
        reworkRatio: engineResult.signals.reworkRatio.value,
        testPresenceScore: engineResult.signals.testFilePresence.value ? 1.0 : 0.0,
        cicdScore: engineResult.signals.cicdConfigDetection.value ? 1.0 : 0.0,
        starsOnOriginalRepos: engineResult.signals.starsOnOriginalRepos.value,
        highPrestigeRepoContributions: engineResult.signals.highPrestigeRepoContributions.value ? 1 : 0,
        newLanguagesAdopted: engineResult.signals.newLanguagesAdopted1yr.value,
        growthTrajectoryScore: engineResult.signals.seniorityTrajectory.value,
        privateOrgActivity: engineResult.signals.privateOrgActivity.value,
        
        // Web3 signals
        web3Signals: {
          coreProtocolPrMerges: engineResult.signals.coreProtocolPrMerges.value,
          securityKeywordReviewDepth: engineResult.signals.securityKeywordReviewDepth.value,
          prestigeForkToPrRatio: engineResult.signals.prestigeForkToPrRatio.value,
          languageEvolutionTrajectory: engineResult.signals.languageEvolutionTrajectory.value,
        },
      };

      await this.prisma.candidateSignals.upsert({
        where: { devCandidateId: profile.devCandidateId },
        create: {
          ...signalData,
          devCandidateId: profile.devCandidateId,
        },
        update: signalData,
      });

      this.logger.log(`Signal computation completed for devCandidate ${profile.devCandidateId} (Cohort: ${normResult.assignedCohort})`);
    } catch (error) {
      this.logger.error(`Signal computation failed for devCandidate ${profile.devCandidateId}: ${error.message}`);
      throw error;
    }
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
