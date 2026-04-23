import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import supertest from 'supertest';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../prisma/prisma.service';
import { getQueueToken } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';

describe('AnalysisController (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let signalQueueMock: any;
  const internalKey = 'test-internal-key';

  beforeAll(async () => {
    process.env.INTERNAL_API_KEY = internalKey;
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getQueueToken('signal-compute'))
      .useValue({
        add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
        getJob: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    signalQueueMock = app.get(getQueueToken('signal-compute'));
  });

  afterEach(async () => {
    // Cleanup users created in tests - cascading delete should handle profiles/candidates
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: '_test@example.com' } },
          { username: { contains: 'torvalds_test' } },
        ],
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('POST /api/analysis/recompute', () => {
    it('should fail without internal key', async () => {
      const response = await supertest(app.getHttpServer())
        .post('/api/analysis/recompute')
        .send({ githubUsername: 'torvalds' });

      expect(response.status).toBe(403);
    });

    it('should enqueue a job for a valid profile', async () => {
      const ts = Date.now();
      const username = `torvalds_test_${ts}`;
      const email = `torvalds_${ts}_test@example.com`;

      // 1. Create a dummy user/profile
      const user = await prisma.user.create({
        data: {
          username,
          email,
        },
      });
      const candidate = await prisma.candidate.create({
        data: { userId: user.id },
      });
      const devCandidate = await prisma.developerCandidate.create({
        data: { candidateId: candidate.id },
      });
      await prisma.githubProfile.create({
        data: {
          devCandidateId: devCandidate.id,
          githubUsername: username, // Use dynamic username
          githubUserId: `id_${ts}`,
          encryptedToken: 'v1:mock:mock:mock',
        },
      });

      // 2. Clear previous calls
      jest.clearAllMocks();

      // 3. Trigger recompute
      const response = await supertest(app.getHttpServer())
        .post('/api/analysis/recompute')
        .set('x-internal-key', internalKey)
        .send({ githubUsername: username }); // Use dynamic username

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('jobId', 'mock-job-id');
      expect(signalQueueMock.add).toHaveBeenCalledWith(
        'sync-profile',
        expect.objectContaining({
          candidateId: expect.any(String),
          githubProfileId: expect.any(String),
        }),
        expect.any(Object), // matches { attempts: 1 }
      );
    });

    it('should return 404 for missing profile', async () => {
      const response = await supertest(app.getHttpServer())
        .post('/api/analysis/recompute')
        .set('x-internal-key', internalKey)
        .send({ githubUsername: 'non-existent-user' });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/analysis/:jobId/result', () => {
    it('should return 404 if job not found in queue', async () => {
      signalQueueMock.getJob.mockResolvedValue(null);

      const response = await supertest(app.getHttpServer()).get(
        '/api/analysis/job-999/result',
      );

      expect(response.status).toBe(404);
    });

    it('should return pending status with progress object parsing', async () => {
      signalQueueMock.getJob.mockResolvedValue({
        getState: jest.fn().mockResolvedValue('active'),
        progress: JSON.stringify({ stage: 'analyzing_projects', percent: 65 }),
      });

      const response = await supertest(app.getHttpServer()).get(
        '/api/analysis/job-123/result',
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'pending',
        progress: 65,
      });
    });

    it('should return completed status with returnvalue', async () => {
      const mockResult = { summary: 'Passes integration' };
      signalQueueMock.getJob.mockResolvedValue({
        getState: jest.fn().mockResolvedValue('completed'),
        progress: 100,
        returnvalue: mockResult,
      });

      const response = await supertest(app.getHttpServer()).get(
        '/api/analysis/job-123/result',
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'completed',
        progress: 100,
        result: mockResult,
      });
    });
  });
});
