import { Test, TestingModule } from '@nestjs/testing';
import { GithubAdapterService } from '../src/scoring/github-adapter/github-adapter.service';
import { SignalExtractorService } from '../src/scoring/signal-extractor/signal-extractor.service';
import { ScoringService } from '../src/scoring/scoring-service/scoring.service';
import { SummaryGeneratorService } from '../src/scoring/summary-generator/summary-generator.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { performance } from 'perf_hooks';
import { ALEX_BACKEND } from '../src/scoring/signal-extractor/__fixtures__/seed-developers';

// Mock Octokit to return instantly
jest.mock('octokit', () => {
  return {
    Octokit: jest.fn().mockImplementation(() => ({
      rest: {
        users: {
          getByUsername: jest.fn().mockImplementation(async () => {
            await new Promise(r => setTimeout(r, 5));
            return {
              data: {
                login: ALEX_BACKEND.profile.username,
                created_at: ALEX_BACKEND.profile.accountCreatedAt.toISOString(),
                public_repos: ALEX_BACKEND.profile.publicRepos,
                followers: ALEX_BACKEND.profile.followers,
              }
            };
          }),
        },
        repos: {
          listForUser: jest.fn().mockImplementation(async () => {
            await new Promise(r => setTimeout(r, 5));
            return {
              data: ALEX_BACKEND.repos.map(r => ({
                name: r.name,
                language: r.language,
                stargazers_count: r.stars,
                forks_count: r.forks,
                topics: r.topics,
                created_at: r.createdAt.toISOString(),
                pushed_at: r.pushedAt.toISOString(),
                fork: r.isFork,
                description: r.description,
              }))
            };
          }),
        }
      },
      graphql: jest.fn().mockImplementation(async () => {
        await new Promise(r => setTimeout(r, 5));
        return {
          user: {
            contributionsCollection: {
              contributionCalendar: {
                weeks: ALEX_BACKEND.contributions.weeklyTotals.map(t => ({
                  contributionDays: [{ contributionCount: t }]
                }))
              }
            },
            pullRequests: {
              nodes: ALEX_BACKEND.externalPRs.externalRepoNames.map(name => ({
                repository: {
                  name,
                  owner: { login: 'external' }
                }
              }))
            }
          }
        };
      })
    }))
  };
});

describe('Fetcher Performance Benchmark', () => {
  let githubAdapter: GithubAdapterService;
  let signalExtractor: SignalExtractorService;
  let scoringService: ScoringService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GithubAdapterService,
        SignalExtractorService,
        SummaryGeneratorService,
        ScoringService,
        {
          provide: PrismaService,
          useValue: { githubProfile: { findUnique: jest.fn() } }
        },
        {
          provide: 'REDIS',
          useValue: { get: jest.fn().mockResolvedValue(null), set: jest.fn() }
        }
      ],
    }).compile();

    githubAdapter = module.get(GithubAdapterService);
    signalExtractor = module.get(SignalExtractorService);
    scoringService = module.get(ScoringService);
  });

  it('should process full pipeline within 2000ms budget', async () => {
    const start = performance.now();

    // 1. Fetch
    const rawData = await githubAdapter.fetchRawData('alex-backend', 'mock-token');
    
    // 2. Extract
    const signals = signalExtractor.extract(rawData);
    expect(signals).toBeDefined();

    // 3. Score
    const result = scoringService.score(rawData);
    expect(result).toBeDefined();

    const end = performance.now();
    const duration = end - start;

    // console.log(`[BENCHMARK] Total Pipeline Time: ${duration.toFixed(2)}ms`);
    
    // Assert < 2000ms
    expect(duration).toBeLessThan(2000);
  });
});
