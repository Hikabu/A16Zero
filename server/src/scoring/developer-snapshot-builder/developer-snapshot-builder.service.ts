import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BehaviorClassificationResult, BehaviorPattern } from '../behavior-classifier/types';
import { ConfidenceEnvelope } from '../confidence-envelope/types';
import { EcosystemNormalisationResult } from '../ecosystem-normaliser/ecosystem-normaliser.service';
import { CapabilityStatement } from '../capability-translator/types';
import { RoleType, Seniority, RiskLevel } from '@prisma/client';

export interface DeveloperSnapshotInput {
  devCandidateId: string;
  behaviorResult: BehaviorClassificationResult;
  confidenceEnvelope: ConfidenceEnvelope;
  ecosystemResult: EcosystemNormalisationResult;
  capabilityStatements: CapabilityStatement[];
  roleFitScore: number;
}

@Injectable()
export class DeveloperSnapshotBuilderService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Builds and persists the DeveloperSnapshot.
   */
  async build(input: DeveloperSnapshotInput, tx?: any) {
    const client = tx || this.prisma;
    const { behaviorResult, confidenceEnvelope, roleFitScore, capabilityStatements } = input;

    // Decision logic
    let decisionSignal = 'REVIEW';
    if (roleFitScore >= 0.70 && confidenceEnvelope.riskLevel === RiskLevel.LOW_RISK) {
      decisionSignal = 'PROCEED';
    } else if (roleFitScore < 0.40) {
      decisionSignal = 'REJECT';
    } else if (roleFitScore >= 0.50 || confidenceEnvelope.riskLevel === RiskLevel.MEDIUM_RISK) {
      decisionSignal = 'REVIEW';
    }

    // Summary generation
    const firstSentence = capabilityStatements.length > 0 ? capabilityStatements[0].text : 'Technical profile analyzed.';
    const summary = `${firstSentence} ${behaviorResult.hrDescription}`;

    // Map inferred seniority (Placeholder logic until RoleFitEngine Stage 4)
    const seniority = this.mapSeniority(behaviorResult.primaryPattern);

    return client.developerSnapshot.upsert({
      where: { devCandidateId: input.devCandidateId },
      create: {
        devCandidateId: input.devCandidateId,
        role: RoleType.GENERALIST, // Default for now
        roleConfidence: 0.7,
        seniority,
        seniorityConf: behaviorResult.primaryConfidence,
        summary,
        riskLevel: confidenceEnvelope.riskLevel,
        decisionSignal,
      },
      update: {
        roleConfidence: 0.7,
        seniority,
        seniorityConf: behaviorResult.primaryConfidence,
        summary,
        riskLevel: confidenceEnvelope.riskLevel,
        decisionSignal,
        generatedAt: new Date(),
      },
    });
  }

  private mapSeniority(pattern: BehaviorPattern): Seniority {
    switch (pattern) {
      case BehaviorPattern.REVIEW_HEAVY_SENIOR:
        return Seniority.SENIOR;
      case BehaviorPattern.COMMIT_HEAVY_MIDLEVEL:
        return Seniority.MID;
      case BehaviorPattern.EARLY_CAREER:
        return Seniority.JUNIOR;
      default:
        return Seniority.MID;
    }
  }
}
