import { Test, TestingModule } from '@nestjs/testing';
import { CareerTimelineReconstructorService } from './career-timeline-reconstructor.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('CareerTimelineReconstructorService', () => {
  let service: CareerTimelineReconstructorService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      careerTimeline: {
        upsert: jest.fn().mockResolvedValue({}),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CareerTimelineReconstructorService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CareerTimelineReconstructorService>(CareerTimelineReconstructorService);
  });

  it('should reconstruct and build a timeline', async () => {
    const input: any = {
      devCandidateId: 'candidate-1',
      careerPhaseResult: {
        phases: [{ startMonth: '2023-01', endMonth: '2023-06', activityLevel: 'HIGH' }],
        trajectory: 'STABLE',
        gapEvents: [],
        peakWindow: { startMonth: '2023-01', endMonth: '2023-01', score: 1 },
      },
      ecosystemResult: { assignedCohort: 'typescript-node' },
      signalResult: {
        signals: {
          externalPrRatio: { value: 0.5 },
          privateOrgActivity: { value: true },
          reviewDepth: { value: 0.6 },
        },
      },
      behaviorResult: { primaryPattern: 'BALANCED' },
    };

    await service.build(input);
    expect(prisma.careerTimeline.upsert).toHaveBeenCalled();
  });
});
