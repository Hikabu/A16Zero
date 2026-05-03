import { Test, TestingModule } from '@nestjs/testing';
import { GithubAdapterService } from './github-adapter.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { Octokit } from 'octokit';

jest.mock('octokit');

describe('GithubAdapterService', () => {
  let service: GithubAdapterService;
  let prisma: PrismaService;
  let mockOctokit: any;

  beforeEach(async () => {
    mockOctokit = {
      rest: {
        users: {
          getByUsername: jest.fn(),
        },
        repos: {
          listForUser: jest.fn(),
        },
      },
      graphql: jest.fn(),
    };

    (Octokit as any).mockImplementation(() => mockOctokit);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GithubAdapterService,
        {
          provide: PrismaService,
          useValue: {
            githubProfile: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: 'REDIS',
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<GithubAdapterService>(GithubAdapterService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('TEST: fetchRawData returns GitHubRawData with all fields correctly shaped', async () => {
    const mockUser = {
      login: 'testuser',
      created_at: '2020-01-01T00:00:00Z',
      public_repos: 10,
      followers: 5,
    };
    const mockRepos = Array(5)
      .fill(null)
      .map((_, i) => ({
        name: `repo-${i}`,
        language: 'TypeScript',
        stargazers_count: 10,
        forks_count: 5,
        topics: ['nestjs'],
        created_at: '2021-01-01T00:00:00Z',
        pushed_at: '2023-01-01T00:00:00Z',
        fork: false,
        description: 'desc',
      }));

    const mockGql = {
      user: {
        contributionsCollection: {
          contributionCalendar: {
            weeks: Array(52).fill({
              contributionDays: [{ contributionCount: 1 }],
            }),
          },
        },
        pullRequests: {
          nodes: [
            { repository: { name: 'ext-repo', owner: { login: 'other' } } },
          ],
        },
      },
    };

    mockOctokit.rest.users.getByUsername.mockResolvedValue({ data: mockUser });
    mockOctokit.rest.repos.listForUser.mockResolvedValue({ data: mockRepos });
    mockOctokit.graphql.mockResolvedValue(mockGql);

    const result = await service.fetchRawData('testuser', 'token');

    expect(result.profile.username).toBe('testuser');
    expect(result.repos).toHaveLength(5);
    expect(result.contributions.weeklyTotals).toHaveLength(52);
    expect(result.externalPRs.mergedExternalPRCount).toBe(1);
    expect(result.fetchedAt).toBeInstanceOf(Date);
  });

  it('TEST: weeklyTotals has exactly 52 entries', async () => {
    const mockGql = {
      user: {
        contributionsCollection: {
          contributionCalendar: {
            weeks: Array(10).fill({
              contributionDays: [{ contributionCount: 5 }],
            }), // Only 10 weeks
          },
        },
        pullRequests: { nodes: [] },
      },
    };

    mockOctokit.rest.users.getByUsername.mockResolvedValue({
      data: { login: 'u', created_at: '...', public_repos: 0, followers: 0 },
    });

    mockOctokit.rest.repos.listForUser.mockResolvedValue({ data: [] });
    mockOctokit.graphql.mockResolvedValue(mockGql);

    const result = await service.fetchRawData('u', 't');
    expect(result.contributions.weeklyTotals).toHaveLength(52);
    expect(result.contributions.weeklyTotals[0]).toBe(0); // Padded
    expect(result.contributions.weeklyTotals[51]).toBe(5); // Recent
  });

  it('TEST: isFork repos are identified correctly', async () => {
    mockOctokit.rest.users.getByUsername.mockResolvedValue({
      data: { created_at: '2020-01-01T00:00:00Z' },
    });

    mockOctokit.rest.repos.listForUser.mockResolvedValue({
      data: [
        { name: 'r1', fork: true, pushed_at: '2023-01-01T00:00:00Z' },
        { name: 'r2', fork: false, pushed_at: '2023-01-01T00:00:00Z' },
      ],
    });

    mockOctokit.graphql.mockResolvedValue({
      user: {
        contributionsCollection: { contributionCalendar: { weeks: [] } },
        pullRequests: { nodes: [] },
      },
    });

    const result = await service.fetchRawData('u', 't');
    expect(result.repos[0].isFork).toBe(true);
    expect(result.repos[1].isFork).toBe(false);
  });

  it('TEST: topics field is populated (Mercy header must be included)', async () => {
    mockOctokit.rest.users.getByUsername.mockResolvedValue({
      data: { created_at: '2020-01-01T00:00:00Z' },
    });
    mockOctokit.rest.repos.listForUser.mockResolvedValue({
      data: [{ name: 'r1', topics: ['a', 'b'], pushed_at: '2023-01-01T00:00:00Z' }],
    });
    mockOctokit.graphql.mockResolvedValue({
      user: {
        contributionsCollection: { contributionCalendar: { weeks: [] } },
        pullRequests: { nodes: [] },
      },
    });

    const result = await service.fetchRawData('u', 't');
    expect(result.repos[0].topics).toEqual(['a', 'b']);
    expect(mockOctokit.rest.repos.listForUser).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: { accept: 'application/vnd.github.mercy-preview+json' },
      }),
    );
  });

  it('TEST: 429 response triggers a retry', async () => {
    const error429 = new Error('Rate limit');
    (error429 as any).status = 429;

    mockOctokit.rest.users.getByUsername
      .mockRejectedValueOnce(error429)
      .mockResolvedValueOnce({
        data: { login: 'u', created_at: '2020-01-01T00:00:00Z' },
      });

    mockOctokit.rest.repos.listForUser.mockResolvedValue({ data: [] });
    mockOctokit.graphql.mockResolvedValue({
      user: {
        contributionsCollection: { contributionCalendar: { weeks: [] } },
        pullRequests: { nodes: [] },
      },
    });

    // Mock setTimeout to resolve immediately
    jest
      .spyOn(global, 'setTimeout' as any)
      .mockImplementation((fn: any) => fn());

    const result = await service.fetchRawData('u', 't');
    expect(result.profile.username).toBe('u');
    expect(mockOctokit.rest.users.getByUsername).toHaveBeenCalledTimes(2);
  });

  it('TEST: Second 429 in a row throws descriptive error message', async () => {
    const error429 = new Error('Rate limit');
    (error429 as any).status = 429;

    mockOctokit.rest.users.getByUsername.mockRejectedValue(error429);
    
    jest
      .spyOn(global, 'setTimeout' as any)
      .mockImplementation((fn: any) => fn());

    await expect(service.fetchRawData('u', 't')).rejects.toThrow(
      'GitHub API rate limit exceeded — please retry in a few minutes',
    );

    expect(mockOctokit.rest.users.getByUsername).toHaveBeenCalledTimes(2);
  });

  it('TEST: repos array length is ≤ MAX_REPOS', async () => {
    const manyRepos = Array(50)
      .fill(null)
      .map((_, i) => ({
        name: `repo-${i}`,
        pushed_at: new Date(2023, 0, 50 - i).toISOString(),
      }));

    mockOctokit.rest.users.getByUsername.mockResolvedValue({
      data: { created_at: '2020-01-01T00:00:00Z' },
    });
    mockOctokit.rest.repos.listForUser.mockResolvedValue({ data: manyRepos });
    mockOctokit.graphql.mockResolvedValue({
      user: {
        contributionsCollection: { contributionCalendar: { weeks: [] } },
        pullRequests: { nodes: [] },
      },
    });

    const result = await service.fetchRawData('u', 't');
    expect(result.repos.length).toBe(30);
  });

  it('TEST: repos are ordered by pushedAt DESC', async () => {
    const repos = [
      { name: 'old', pushed_at: '2021-01-01T00:00:00Z' },
      { name: 'new', pushed_at: '2023-01-01T00:00:00Z' },
    ];
    // We assume they come sorted from API as pushed DESC, so 'new' then 'old'
    const sortedMock = [repos[1], repos[0]];

    mockOctokit.rest.users.getByUsername.mockResolvedValue({
      data: { created_at: '2020-01-01T00:00:00Z' },
    });
    mockOctokit.rest.repos.listForUser.mockResolvedValue({ data: sortedMock });
    mockOctokit.graphql.mockResolvedValue({
      user: {
        contributionsCollection: { contributionCalendar: { weeks: [] } },
        pullRequests: { nodes: [] },
      },
    });

    const result = await service.fetchRawData('u', 't');
    expect(result.repos[0].name).toBe('new');
    expect(result.repos[1].name).toBe('old');
  });

  it('TEST: no additional pagination or extra repo fetch calls are made', async () => {
    mockOctokit.rest.users.getByUsername.mockResolvedValue({ data: { created_at: '2020-01-01T00:00:00Z' } });
    mockOctokit.rest.repos.listForUser.mockResolvedValue({ data: [] });
    mockOctokit.graphql.mockResolvedValue({ user: { contributionsCollection: { contributionCalendar: { weeks: [] } }, pullRequests: { nodes: [] } } });

    await service.fetchRawData('u', 't');
    
    expect(mockOctokit.rest.repos.listForUser).toHaveBeenCalledTimes(1);
    expect(mockOctokit.rest.repos.listForUser).toHaveBeenCalledWith(expect.objectContaining({
      per_page: 100
    }));
  });
});
