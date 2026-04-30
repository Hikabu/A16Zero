import { Test, TestingModule } from '@nestjs/testing';
import { JobsService } from './jobs.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JobStatus, RoleType, Seniority } from '@prisma/client';
import { AppException } from '../../shared/app.exception';

describe('JobsService', () => {
  let service: JobsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    jobPost: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a job draft', async () => {
      const companyId = 'company-1';
      const dto = {
        title: 'Backend Engineer',
        description: 'Job description',
        bonusAmount: 1000,
        roleType: RoleType.BACKEND,
      };

      mockPrismaService.jobPost.create.mockResolvedValue({ id: 'job-1', ...dto, companyId, status: JobStatus.DRAFT });

      const result = await service.create(companyId, dto as any);

      expect(prisma.jobPost.create).toHaveBeenCalledWith({
        data: {
          ...dto,
          companyId,
          status: JobStatus.DRAFT,
        },
      });
      expect(result.status).toBe(JobStatus.DRAFT);
    });
  });

  describe('getPublicJobs', () => {
    it('should return a list of active jobs with pagination', async () => {
      const query = { page: 1, limit: 10 };
      const mockJobs = [{ id: 'job-1', title: 'Job 1' }];
      mockPrismaService.jobPost.findMany.mockResolvedValue(mockJobs);
      mockPrismaService.jobPost.count.mockResolvedValue(1);

      const result = await service.getPublicJobs(query);

      expect(prisma.jobPost.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { status: JobStatus.ACTIVE },
        skip: 0,
        take: 10,
      }));
      expect(result.jobs).toEqual(mockJobs);
      expect(result.total).toBe(1);
    });

    it('should apply filters correctly', async () => {
      const query = {
        search: 'NestJS',
        roleType: RoleType.BACKEND,
        seniority: Seniority.SENIOR,
        isWeb3: true,
      };

      mockPrismaService.jobPost.findMany.mockResolvedValue([]);
      mockPrismaService.jobPost.count.mockResolvedValue(0);

      await service.getPublicJobs(query);

      expect(prisma.jobPost.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          status: JobStatus.ACTIVE,
          OR: [
            { title: { contains: 'NestJS', mode: 'insensitive' } },
            { description: { contains: 'NestJS', mode: 'insensitive' } },
          ],
          roleType: RoleType.BACKEND,
          seniorityLevel: Seniority.SENIOR,
          isWeb3Role: true,
        },
      }));
    });
  });

  describe('getPublicJobById', () => {
    it('should return a job if it is active', async () => {
      const job = {
        id: 'job-1',
        status: JobStatus.ACTIVE,
        _count: { shortlists: 5 },
      };
      mockPrismaService.jobPost.findUnique.mockResolvedValue(job);

      const result = await service.getPublicJobById('job-1');

      expect(result.id).toBe('job-1');
      expect(result.applicationCount).toBe(5);
    });

    it('should throw AppException if job not found', async () => {
      mockPrismaService.jobPost.findUnique.mockResolvedValue(null);

      await expect(service.getPublicJobById('invalid')).rejects.toThrow(AppException);
    });
  });
});
