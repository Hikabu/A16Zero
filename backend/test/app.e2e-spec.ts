
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrivyService } from '../src/auth/privy.service';
import { APP_GUARD } from '@nestjs/core';

describe('APP E2E', () => {
  let app: INestApplication;
  let server: any;

  const mockPrivyUser = {
    privyId: 'did:privy:test-user',
    walletAddress: '0xTEST_WALLET',
  };
  const mockAuthGuard = {
  canActivate: jest.fn(() => true),
};

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrivyService)
      .useValue({
        verifyToken: jest.fn().mockResolvedValue(mockPrivyUser),
      })
       .overrideProvider(APP_GUARD)
       .useValue(mockAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    server = app.getHttpServer();
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