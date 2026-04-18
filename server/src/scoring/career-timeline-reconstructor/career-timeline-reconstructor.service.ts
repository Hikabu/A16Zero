import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CareerPhaseResult } from '../career-phase-engine/types';
import { EcosystemNormalisationResult } from '../ecosystem-normaliser/ecosystem-normaliser.service';
import { PrivacyAdjustmentResult } from '../privacy-adjustment-engine/types';
import { SignalComputeResult } from '../signal-engine/types';
import { BehaviorClassificationResult } from '../behavior-classifier/types';

export interface CareerTimelineInput {
  devCandidateId: string;
  careerPhaseResult: CareerPhaseResult;
  ecosystemResult: EcosystemNormalisationResult;
  privacyResult: PrivacyAdjustmentResult;
  signalResult: SignalComputeResult;
  behaviorResult: BehaviorClassificationResult;
}

@Injectable()
export class CareerTimelineReconstructorService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Reconstructs and persists the CareerTimeline.
   */
  async build(input: CareerTimelineInput, tx?: any) {
    const client = tx || this.prisma;
    const { careerPhaseResult, ecosystemResult, signalResult, behaviorResult } = input;

    const extPrRatio = (signalResult.signals.externalPrRatio?.value as number) || 0;
    const privateOrg = signalResult.signals.privateOrgActivity?.value === true;
    const reviewDepth = (signalResult.signals.reviewDepth?.value as number) || 0;

    const contextInference = {
      workEnvironment: extPrRatio > 0.4 ? 'OSS/Startup' : (privateOrg ? 'Enterprise' : 'Unknown'),
      collaborationStyle: behaviorResult.primaryPattern,
      teamPattern: reviewDepth > 0.5 ? 'Team contributor' : 'Solo builder',
      ecosystemContext: ecosystemResult.assignedCohort,
    };

    return client.careerTimeline.upsert({
      where: { devCandidateId: input.devCandidateId },
      create: {
        devCandidateId: input.devCandidateId,
        phases: careerPhaseResult.phases as any,
        trajectory: careerPhaseResult.trajectory,
        gapEvents: careerPhaseResult.gapEvents as any,
        peakWindow: careerPhaseResult.peakWindow as any,
        contextInference: contextInference as any,
      },
      update: {
        phases: careerPhaseResult.phases as any,
        trajectory: careerPhaseResult.trajectory,
        gapEvents: careerPhaseResult.gapEvents as any,
        peakWindow: careerPhaseResult.peakWindow as any,
        contextInference: contextInference as any,
        generatedAt: new Date(),
      },
    });
  }
}
