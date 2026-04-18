import { Test, TestingModule } from '@nestjs/testing';
import { DeveloperSnapshotBuilderService } from './developer-snapshot-builder.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RiskLevel } from '@prisma/client';

describe('DeveloperSnapshotBuilderService', () => {
  let service: DeveloperSnapshotBuilderService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      developerSnapshot: {
        upsert: jest.fn().mockResolvedValue({}),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeveloperSnapshotBuilderService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<DeveloperSnapshotBuilderService>(DeveloperSnapshotBuilderService);
  });

  it('should build a snapshot with correct decisioning', async () => {
    const input: any = {
      devCandidateId: 'candidate-1',
      behaviorResult: { hrDescription: 'Expert Architect', primaryPattern: 'REVIEW_HEAVY_SENIOR', primaryConfidence: 0.9 },
      confidenceEnvelope: { riskLevel: RiskLevel.LOW_RISK, scoreWithheld: false },
      ecosystemResult: { assignedCohort: 'typescript-node' },
      capabilityStatements: [{ text: 'Statement 1' }],
      roleFitScore: 0.85,
    };

    await service.build(input);
    
    expect(prisma.developerSnapshot.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { devCandidateId: 'candidate-1' },
      create: expect.objectContaining({
        decisionSignal: 'PROCEED',
      }),
    }));
  });
});
