import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { GithubAdapterService } from '../src/scoring/github-adapter/github-adapter.service';
import { RoleType } from '@prisma/client';
import { resetAfter } from './shared';

describe('Stage 2 Deliverable (E2E)', () => {
  let app: INestApplication;
  let githubAdapter: any;
  const INTERNAL_KEY = 'test-internal-key';

  beforeAll(async () => {
    githubAdapter = {
      fetchRawDataByUsername: jest.fn().mockResolvedValue({
        rest: { repos: [], languages: {}, commits: {} },
        graphql: { pullRequests: [], reviewsGiven: [], contributionCalendar: { totalContributions: 100, weeks: [] } },
        events: { events: [] },
        fetchedAt: new Date().toISOString(),
        accountCreatedAt: '2020-01-01T00:00:00Z',
      }),
      fetchUserProfile: jest.fn().mockResolvedValue({ id: 123, created_at: '2020-01-01T00:00:00Z' }),
    };

    process.env.INTERNAL_API_KEY = INTERNAL_KEY;
    process.env.GITHUB_SYSTEM_TOKEN = 'mock-token';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GithubAdapterService)
      .useValue(githubAdapter)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await resetAfter(app);
  });

  describe('Headless Preview Endpoint', () => {
    it('should fail without internal key', () => {
      return request(app.getHttpServer())
        .post('/api/scorecard/preview')
        .send({ githubUsername: 'testuser', roleType: RoleType.GENERALIST })
        .expect(403);
    });

    it('should execute full pipeline and return valid scorecard', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/scorecard/preview')
        .set('x-internal-key', INTERNAL_KEY)
        .send({ githubUsername: 'testuser', roleType: RoleType.GENERALIST })
        .expect(200);

      expect(response.body).toHaveProperty('profile');
      expect(response.body).toHaveProperty('score');
      expect(response.body).toHaveProperty('trust');
      expect(response.body).toHaveProperty('insights');
      expect(response.body.score).toHaveProperty('value');
    });

    it('should result in scoreWithheld: true when data coverage is low (0 contributions)', async () => {
     githubAdapter.fetchRawDataByUsername.mockResolvedValueOnce({
  rest: {
    repos: [],           // ok
    languages: {},
    commits: {},         // ok
  },
  graphql: {
    pullRequests: [],    // ok
    reviewsGiven: [],
    contributionCalendar: {
      totalContributions: 0,
      weeks: [],
    },
  },
  events: {
    events: [],          // IMPORTANT
  },
  fetchedAt: new Date().toISOString(),
  accountCreatedAt: '2020-01-01T00:00:00Z',
});
      const response = await request(app.getHttpServer())
        .post('/api/scorecard/preview')
        .set('x-internal-key', INTERNAL_KEY)
        .send({ githubUsername: 'testuser', roleType: RoleType.GENERALIST })
        .expect(200);
        // console.log(response.body.confidenceEnvelope);
expect(githubAdapter.fetchRawDataByUsername).toHaveBeenCalled();
      expect(response.body.score.isWithheld.value).toBe(true);
      expect(response.body.score.isWithheld).toHaveProperty('reason');
    });

  //   it('should result in scoreWithheld: true when data coverage is low (0 contributions)', async () => {
  //     // DataCompletenessEngine will yield low coverage for empty fixture
  //     const response = await request(app.getHttpServer())
  //       .post('/api/scorecard/preview')
  //       .set('x-internal-key', INTERNAL_KEY)
  //       .send({ githubUsername: 'testuser', roleType: RoleType.GENERALIST })
  //       .expect(200);

  //     expect(response.body.confidenceEnvelope.scoreWithheld).toBe(true);
  //   });
  });

  describe('Pipeline Determinism', () => {
    it('should produce identical results for consecutive runs on same data', async () => {
      const res1 = await request(app.getHttpServer())
        .post('/api/scorecard/preview')
        .set('x-internal-key', INTERNAL_KEY)
        .send({ githubUsername: 'testuser', roleType: RoleType.GENERALIST })
        .expect(200);

      const res2 = await request(app.getHttpServer())
        .post('/api/scorecard/preview')
        .set('x-internal-key', INTERNAL_KEY)
        .send({ githubUsername: 'testuser', roleType: RoleType.GENERALIST })
        .expect(200);

      expect(res1.body.score.value).toBe(res2.body.score.value);
      expect(res1.body.profile.summary).toBe(res2.body.profile.summary);
    });
  });
});
