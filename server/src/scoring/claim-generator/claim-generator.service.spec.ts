import { Test, TestingModule } from '@nestjs/testing';
import { ClaimGeneratorService } from './claim-generator.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ClaimGeneratorService', () => {
  let service: ClaimGeneratorService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      candidateClaim: {
        updateMany: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockResolvedValue({}),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClaimGeneratorService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ClaimGeneratorService>(ClaimGeneratorService);
  });

  it('should generate claims with evidence signals', async () => {
    const input: any = {
      devCandidateId: 'candidate-1',
      capabilityStatements: [
        { key: 'consistentActivity', text: 'Consistent coder', confidence: 0.9, supportingSignals: ['activeWeeksRatio'] },
      ],
    };

    await service.generate(input);
    
    expect(prisma.candidateClaim.updateMany).toHaveBeenCalled();
    expect(prisma.candidateClaim.create).toHaveBeenCalled();
  });
});
