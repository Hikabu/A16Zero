import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ScorecardUiDto } from './contract/scorecard.dto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ScorecardResult } from './scorecard.types';
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
import { GithubAdapterService } from '../scoring/github-adapter/github-adapter.service';
import { RoleType } from '@prisma/client';
import { PillarKey } from '../scoring/signal-engine/types';

@Injectable()
export class ScorecardService {
  private readonly logger = new Logger(ScorecardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly githubAdapter: GithubAdapterService,
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
  ) {}

  async computeForCandidate(candidateId: string): Promise<ScorecardResult> {
    const candidate = await this.prisma.developerCandidate.findUnique({
      where: { candidateId },
      include: {
        signals: true,
        snapshot: true,
        timeline: true,
        claims: true,
      },
    });

    if (!candidate || !candidate.signals || !candidate.snapshot || !candidate.timeline) {
      throw new NotFoundException(`Scorecard for candidate ${candidateId} not found or incomplete`);
    }

    // Since we don't store behavior result and percentile result as standalone models,
    // we reconstruct them from signals if needed, or simply return the stored signals.
    // For MVP, we return them as mapped from the signals model.
    return {
      snapshot: candidate.snapshot,
      timeline: candidate.timeline,
      signals: candidate.signals,
      claims: candidate.claims,
      confidenceEnvelope: {
        overallConfidence: candidate.signals.confidenceScore ?? 0,
        confidenceTier: candidate.signals.confidenceTier as any,
        riskLevel: candidate.signals.riskLevel as any,
        hrLabel: '', // Reconstructed if needed
        hrGuidance: '',
        caveats: candidate.signals.confidenceCaveats as any,
        scoreWithheld: candidate.signals.dataCoveragePercent < 40,
      },
      percentile: {
        ecosystemPercentile: candidate.signals.ecosystemPercentile ?? 0,
        ecosystemPercentileLabel: candidate.signals.percentileLabel ?? '',
        crossEcosystemPercentile: 50, // Default for now
        cohortSize: 0,
      },
      behaviorClassification: {
        primaryPattern: candidate.signals.behaviorPattern as any,
        primaryConfidence: candidate.signals.behaviorConfidence ?? 0,
        secondaryPattern: null,
        hrLabel: '',
        hrDescription: '',
        accuracyDisclosure: null,
      },
    };
  }

  async previewForUsername(githubUsername: string, roleType: RoleType): Promise<ScorecardResult> {
    this.logger.log(`Running headless preview for ${githubUsername} as ${roleType}`);
    
    const githubToken = this.configService.get<string>('GITHUB_SYSTEM_TOKEN');
    if (!githubToken) {
      throw new Error('GITHUB_SYSTEM_TOKEN not configured');
    }

    // 1. Fetch Raw Data
    const rawData = await this.githubAdapter.fetchRawData(githubUsername, githubToken);
    const accountCreatedAt = rawData.profile.accountCreatedAt;

    // 2. Execute Full Pipeline (In-Memory)
    const firewallResult = this.firewall.process(githubUsername, accountCreatedAt.toISOString(), rawData as any);
    const engineResult = this.signalEngine.compute(githubUsername, firewallResult, accountCreatedAt.toISOString());

    const defaultWeights: Record<PillarKey, number> = {
      ACTIVITY: 0.20,
      COLLABORATION: 0.20,
      QUALITY: 0.20,
      RELIABILITY: 0.10,
      IMPACT: 0.15,
      GROWTH: 0.15,
    };
    const completenessResult = this.dataCompleteness.compute(engineResult, defaultWeights);
    const privacyResult = this.privacyAdjustment.compute({ events: [] } as any); // events removed in R2.2

    const accountAgeMonths = this.calculateAccountAgeMonths(new Date(accountCreatedAt));
    const phaseResult = this.careerPhase.compute(rawData as any, accountCreatedAt.toISOString());
    const behaviorResult = this.behaviorClassifier.compute(engineResult, accountAgeMonths, {
      careerGapDetected: phaseResult.careerGapDetected,
      historicalStrength: phaseResult.peakWindow.score,
    });

    const ecosystemResult = this.normaliser.normalise(engineResult);
    const temporalResult = this.temporalScore.compute(engineResult, phaseResult, { historicalWeight: 0.4, recentWeight: 0.6 }, rawData as any);
    const percentileResult = await this.percentileCalculator.calculate(
      ecosystemResult.assignedCohort,
      ecosystemResult.normalisedSignals,
    );

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

    const translationResult = this.capabilityTranslator.translate(engineResult, behaviorResult, confidenceResult);

    // 3. Reconstruct Output Objects (without DB write)
    const snapshot: any = {
      id: 'preview-id',
      devCandidateId: 'preview-candidate',
      role: roleType,
      roleConfidence: 0.8, // Stubbed
      seniority: 'MID', // Stubbed
      seniorityConf: 0.7, // Stubbed
      summary: behaviorResult.hrLabel,
      riskLevel: confidenceResult.riskLevel,
      decisionSignal: confidenceResult.scoreWithheld ? 'REVIEW' : (confidenceResult.riskLevel === 'HIGH_RISK' ? 'REVIEW' : 'PROCEED'),
      generatedAt: new Date(),
    };

    const timeline: any = {
      id: 'preview-id',
      devCandidateId: 'preview-candidate',
      phases: phaseResult.phases,
      trajectory: phaseResult.trajectory,
      gapEvents: phaseResult.gapEvents,
      peakWindow: phaseResult.peakWindow,
      contextInference: {}, // Logic from timeline reconstructor would go here
      generatedAt: new Date(),
    };

    const signals = this.mapSignalData('preview-candidate', engineResult, ecosystemResult, percentileResult, confidenceResult, completenessResult);

    const claims = translationResult.capabilityStatements.map((cap, index) => ({
      id: `claim-${index}`,
      devCandidateId: 'preview-candidate',
      claimType: 'ACTIVITY', // Placeholder
      claimKey: cap.key,
      description: cap.text,
      supportingSignals: cap.supportingSignals,
      evidenceLinks: [],
      confidence: cap.confidence,
      isActive: true,
      createdAt: new Date(),
    })) as any[];

    return {
      snapshot,
      timeline,
      signals,
      claims,
      confidenceEnvelope: confidenceResult,
      percentile: percentileResult,
      behaviorClassification: behaviorResult,
    };
  }

  mapToUiModel(result: ScorecardResult): ScorecardUiDto {
    const { snapshot, confidenceEnvelope, percentile, behaviorClassification, claims } = result;

    return {
      profile: {
        username: result.signals.devCandidateId, 
        avatarUrl: undefined, 
        primaryCohort: result.signals.ecosystemCohort ?? 'unknown',
        seniority: snapshot.seniority as any,
        summary: snapshot.summary ?? 'Reviewing developer history...',
      },
      score: {
        value: percentile.ecosystemPercentile, 
        percentile: percentile.ecosystemPercentile,
        isWithheld: {
          value: confidenceEnvelope.scoreWithheld,
          reason: confidenceEnvelope.scoreWithheld 
            ? "Insufficient verified activity found to generate a reliable score." 
            : undefined,
        },
      },
      trust: {
        level: confidenceEnvelope.confidenceTier,
        risk: confidenceEnvelope.riskLevel as any,
        label: confidenceEnvelope.hrLabel ?? 'UNCERTAIN',
        guidance: confidenceEnvelope.hrGuidance ?? 'Contact support for manual review.',
      },
      insights: {
        capabilities: claims.filter(c => c.confidence > 0.7).map(c => c.description ?? ''),
        gaps: confidenceEnvelope.caveats.filter(c => c.severity === 'CRITICAL').map(c => c.hrReadable ?? ''),
        caveats: confidenceEnvelope.caveats.map(c => c.hrReadable ?? ''),
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
    completenessResult: any,
  ): any {
    return {
      devCandidateId,
      computedAt: new Date(),
      fraudScore: engineResult.fraudScore,
      fraudTier: engineResult.fraudTier,
      ecosystemCohort: ecosystemResult.assignedCohort,
      ecosystemPercentile: percentileResult.ecosystemPercentile,
      percentileLabel: percentileResult.ecosystemPercentileLabel,
      languageDistribution: engineResult.languageDistribution,
      dataCoveragePercent: completenessResult.dataCoveragePercent,
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
}
