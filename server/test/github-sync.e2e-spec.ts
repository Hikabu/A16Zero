import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import supertest from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { GithubAdapterService } from '../src/scoring/github-adapter/github-adapter.service';
import { GITHUB_REST_FIXTURE } from '../src/scoring/github-adapter/__fixtures__/github-rest.fixture';
import { GITHUB_GRAPHQL_FIXTURE } from '../src/scoring/github-adapter/__fixtures__/github-graphql.fixture';
import { GITHUB_EVENTS_FIXTURE } from '../src/scoring/github-adapter/__fixtures__/github-events.fixture';
import { GithubSyncProcessor } from '../src/queues/github-sync.processor';
import { JwtService } from '@nestjs/jwt';
import { UserRole, SyncStatus } from '@prisma/client';
import { encrypt } from '../src/shared/crypto.utils';
import { execSync } from 'child_process';
import { getQueueToken } from '@nestjs/bullmq';

const expectedGraphQL = {
  pullRequests: GITHUB_GRAPHQL_FIXTURE.pullRequests.length,
  reviewsGiven: GITHUB_GRAPHQL_FIXTURE.reviewsGiven.length,
  contributions: GITHUB_GRAPHQL_FIXTURE.contributionCalendar.totalContributions,
};

describe('GithubSync (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;
  let processor: GithubSyncProcessor;
  let signalQueueMock: any;

  const originalDbUrl = process.env.DATABASE_URL;
  const testDbUrl = originalDbUrl + '_test';

  beforeAll(async () => {
    // Setup Test DB
    process.env.DATABASE_URL = testDbUrl;
    
    // Create DB if not exists (Postgres specific)
    try {
      const dbName = testDbUrl.split('/').pop()?.split('?')[0];
      const baseConnectionString = originalDbUrl?.substring(0, originalDbUrl.lastIndexOf('/')) + '/postgres';
      // Simple raw command to create DB
      // Note: This might need adjustments depending on the environment, but it's a standard approach for CI
      execSync(`psql ${baseConnectionString} -c "CREATE DATABASE ${dbName};" || true`);
    } catch (e) {
      console.log('Database might already exist or psql not available');
    }

    // Run migrations
    execSync('npx prisma migrate deploy', { env: { ...process.env, DATABASE_URL: testDbUrl } });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GithubAdapterService)
      .useValue({
        fetchRestData: jest.fn().mockResolvedValue(GITHUB_REST_FIXTURE),
        fetchGraphQLData: jest.fn().mockResolvedValue(GITHUB_GRAPHQL_FIXTURE),
        fetchEventsData: jest.fn().mockResolvedValue(GITHUB_EVENTS_FIXTURE),
        decryptToken: jest.fn().mockReturnValue('mock-token'),
      })
      .overrideProvider(getQueueToken('signal-compute'))
      .useValue({
        add: jest.fn().mockResolvedValue({ id: 'signal-job-id' }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    jwt = app.get<JwtService>(JwtService);
    processor = app.get<GithubSyncProcessor>(GithubSyncProcessor);
    signalQueueMock = app.get(getQueueToken('signal-compute'));
  });

  afterAll(async () => {
    // Cleanup
    await prisma.user.deleteMany();
    await prisma.$disconnect();
    const signalQueue = app.get(getQueueToken('signal-compute'));
await signalQueue.close?.();
    const redis = app.get('REDIS');
await redis.quit();
    await app.close();
    process.env.DATABASE_URL = originalDbUrl;
  });

  let testUser: any;
  let testCandidate: any;
  let testGithubProfile: any;
  let accessToken: string;

  it('Step 1-2: Setup test user and issue JWT', async () => {
    testUser = await prisma.user.create({
      data: {
        email: 'tester@example.com',
        isEmailVerified: true,
        role: UserRole.CANDIDATE,
      },
    });

    testCandidate = await prisma.candidate.create({
      data: {
        userId: testUser.id,
      },
    });

    const devCandidate = await prisma.developerCandidate.create({
      data: {
        candidateId: testCandidate.id,
      },
    });

    const encryptedToken = encrypt('fake-token', process.env.AUTH_ENCRYPTION_KEY!);

    testGithubProfile = await prisma.githubProfile.create({
      data: {
        devCandidateId: devCandidate.id,
        githubUsername: 'testuser',
        githubUserId: '12345',
        encryptedToken,
        syncStatus: SyncStatus.PENDING,
      },
    });

    accessToken = jwt.sign(
      { sub: testUser.id, isEmailVerified: true, role: UserRole.CANDIDATE },
      { secret: process.env.JWT_ACCESS_SECRET }
    );
  });

  it('Step 3: POST /api/me/github/sync', async () => {
    const response = await supertest(app.getHttpServer())
      .post('/me/github/sync')
      .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(201); // Triggering sync returns 201 for Created (job queued)
    
    const profile = await prisma.githubProfile.findUnique({
      where: { id: testGithubProfile.id },
    });
    expect(profile?.syncStatus).toBe(SyncStatus.PENDING);
  });

  it('Step 4-5: Invoke processor and verify state', async () => {
  const mockJob: any = {
    id: 'job-1',
    data: {
      candidateId: testCandidate.id,
      githubProfileId: testGithubProfile.id,
    },
  };

  await processor.process(mockJob);

  const updatedProfile = await prisma.githubProfile.findUnique({
    where: { id: testGithubProfile.id },
  });

  expect(updatedProfile?.syncStatus).toBe(SyncStatus.DONE);
  expect(updatedProfile?.syncProgress).toBe('COMPLETE');
  expect(updatedProfile?.rawDataSnapshot).toBeDefined();

  const snapshot = updatedProfile!.rawDataSnapshot as any;

  // REST layer
  expect(snapshot.rest.repos.length).toBe(
    GITHUB_REST_FIXTURE.repos.length ?? 5
  );

  // GRAPHQL layer (deterministic)
  expect(snapshot.graphql.pullRequests.length).toBe(
    expectedGraphQL.pullRequests
  );

  expect(snapshot.graphql.reviewsGiven.length).toBe(
    expectedGraphQL.reviewsGiven
  );

  expect(snapshot.graphql.contributionCalendar.totalContributions).toBe(
    expectedGraphQL.contributions
  );

  // EVENTS (make it fixture-driven if possible)
  expect(snapshot.events.events.length).toBe(
    GITHUB_EVENTS_FIXTURE.events.length
  );

  expect(new Date(updatedProfile!.lastSyncAt!).getTime())
    .toBeGreaterThan(Date.now() - 5000);

  expect(signalQueueMock.add).toHaveBeenCalledWith(
    'compute-signals',
    expect.objectContaining({ githubProfileId: testGithubProfile.id })
  );
});
  it('Step 6: POST /api/me/github/sync again (Rate Limit)', async () => {
    const response = await supertest(app.getHttpServer())
      .post('/me/github/sync')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(429);
    expect(response.body.message).toContain('Rate limit');
    expect(response.body.retryAfter).toBeDefined();
  });

  it('Step 7: GET /api/me/github/sync/status', async () => {
    const response = await supertest(app.getHttpServer())
      .get('/me/github/sync/status')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.syncStatus).toBe('DONE');
    expect(response.body.syncProgress).toBe('COMPLETE');
  });
});
