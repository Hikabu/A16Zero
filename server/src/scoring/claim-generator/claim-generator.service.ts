import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SignalComputeResult } from '../signal-engine/types';
import { CapabilityStatement } from '../capability-translator/types';
import { ClaimType } from '@prisma/client';

export interface ClaimGeneratorInput {
  devCandidateId: string;
  capabilityStatements: CapabilityStatement[];
  signalResult: SignalComputeResult;
}

@Injectable()
export class ClaimGeneratorService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates and persists candidate claims based on capability statements.
   */
  async generate(input: ClaimGeneratorInput, tx?: any) {
    const client = tx || this.prisma;
    const { devCandidateId, capabilityStatements } = input;

    // Remove old active claims before regenerating
    await client.candidateClaim.updateMany({
      where: { devCandidateId, isActive: true },
      data: { isActive: false },
    });

    const claims = capabilityStatements.map((stmt) => {
      return client.candidateClaim.create({
        data: {
          devCandidateId,
          claimType: this.mapClaimType(stmt.key),
          claimKey: stmt.key,
          description: stmt.text,
          supportingSignals: stmt.supportingSignals as any,
          evidenceLinks: [] as any, // Placeholder for repo URLs
          confidence: stmt.confidence,
          isActive: true,
        },
      });
    });

    return Promise.all(claims);
  }

  private mapClaimType(key: string): ClaimType {
    const map: Record<string, ClaimType> = {
      consistentActivity: ClaimType.ACTIVITY,
      strongCodeReview: ClaimType.COLLABORATION,
      testingDiscipline: ClaimType.QUALITY,
      cicdExperience: ClaimType.QUALITY,
      ossContributor: ClaimType.COLLABORATION,
      prestigeContrib: ClaimType.IMPACT,
      highAcceptance: ClaimType.QUALITY,
      techAdaptability: ClaimType.GROWTH,
      enterpriseExperience: ClaimType.ACTIVITY,
      reliableDelivery: ClaimType.ACTIVITY,
    };
    return map[key] || ClaimType.ACTIVITY;
  }
}
