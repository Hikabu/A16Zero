
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrivyService } from '../src/auth/privy.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('APP E2E', () => {
  let app: INestApplication;
  let server: any;
  let prisma: PrismaService;

  const mockPrivyIdentity = {
    privyId: 'did:privy:test-user',
    email: 'test-company@example.com',
  };
  const mockPrivyProfile = {
    linked_accounts: [
      {
        type: 'wallet',
        address: '0xTEST_WALLET',
      },
    ],
  };
  const mockPrivyService = {
    verifyToken: jest.fn().mockResolvedValue(mockPrivyIdentity),
    getUser: jest.fn().mockResolvedValue(mockPrivyProfile),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrivyService)
      .useValue(mockPrivyService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    server = app.getHttpAdapter().getInstance();
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    try {
      await prisma.jobPost.deleteMany();
      await prisma.company.deleteMany();
    } catch (error) {
      // Allow the suite to run even if the local test database has not been migrated yet.
    }
  });

  afterAll(async () => {
    await app.close();
  });

//Health check test

it('GET / should return Hello World', async () => {
  const res = await request(server).get('/');

  expect(res.status).toBe(200);
  expect(res.text).toBe('Hello World!');
});
//Auth login tests fail

it('POST /auth/login should fail without token', async () => {
  const res = await request(server)
    .post('/auth/login')
    .send({ walletAddress: '0x123' });

  expect(res.status).toBe(401);
});

//wallet
it('POST /auth/login should return 400 when walletAddress is missing', async () => {
  const res = await request(server)
    .post('/auth/login')
    .set('Authorization', 'Bearer debugtoken')
    .send({}); // Missing walletAddress

  expect(res.status).toBe(400);
  // Verify the specific validation error
  expect(res.body).toHaveProperty('error');
});

//login 
let appJwt: string;

it('POST /auth/login should return app JWT', async () => {
  const res = await request(server)
    .post('/auth/login')
    .set('Authorization', 'Bearer debugtoken')
    .send({
      walletAddress: '0x123',
      smartAccountAddress: '0xabc',
    });

  expect(res.status).toBe(201);
  expect(res.body.data.accessToken).toBeDefined();
  expect(mockPrivyService.verifyToken).toHaveBeenCalledWith('debugtoken');
  expect(mockPrivyService.getUser).toHaveBeenCalledWith(mockPrivyIdentity.privyId);

  appJwt = res.body.data.accessToken;
});

//route guards
it('GET /companies/me should reject without JWT', async () => {
  const res = await request(server).get('/companies/me');
  expect(res.status).toBe(401);
});

//comp
it('GET /companies/me should return company', async () => {
  const res = await request(server)
    .get('/companies/me')
    .set('Authorization', `Bearer ${appJwt}`);

  expect(res.status).toBe(200);
  expect(res.body.data.walletAddress).toBe('0xTEST_WALLET');
  expect(res.body.data.privyId).toBe(mockPrivyIdentity.privyId);
});

//job flow 
let jobId: string;

it('POST /jobs should create job', async () => {
  const res = await request(server)
    .post('/jobs')
    .set('Authorization', `Bearer ${appJwt}`)
    .send({
      title: 'NestJS Engineer',
      description: 'Test job',
      bonusAmount: 100,
      location: 'Remote',
      employmentType: 'Full-time',
      currency: 'USD',
    });

  expect(res.status).toBe(201);
  expect(res.body.data.status).toBe('DRAFT');

  jobId = res.body.data.id;
});

//get my job
it('GET /jobs/my should list jobs', async () => {
  const res = await request(server)
    .get('/jobs/my')
    .set('Authorization', `Bearer ${appJwt}`);

  expect(res.status).toBe(200);
  expect(res.body.data.length).toBeGreaterThan(0);
});

//pub job
it('POST /jobs/:id/publish should activate job', async () => {
  const res = await request(server)
    .post(`/jobs/${jobId}/publish`)
    .set('Authorization', `Bearer ${appJwt}`);

  expect(res.status).toBe(200);
  expect(res.body.data.status).toBe('ACTIVE');
});

//close job 
it('POST /jobs/:id/close should close job', async () => {
  const res = await request(server)
    .post(`/jobs/${jobId}/close`)
    .set('Authorization', `Bearer ${appJwt}`);

  expect(res.status).toBe(200);
  expect(res.body.data.status).toBe('CLOSED');
});

//anal tests
it('GET /analytics/dashboard should return stats', async () => {
  const res = await request(server)
    .get('/analytics/dashboard')
    .set('Authorization', `Bearer ${appJwt}`);

  expect(res.status).toBe(200);
  expect(res.body.data.totalJobs).toBeGreaterThanOrEqual(1);
});
});
