import { Test, TestingModule } from '@nestjs/testing';
import { GithubAdapterService } from './github-adapter.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as cryptoUtils from '../../shared/crypto.utils';
import { Octokit } from 'octokit';
import { SyncStatus } from '@prisma/client';

const MockOctokit = Octokit as unknown as jest.Mock;

jest.mock('octokit');
jest.mock('../../shared/crypto.utils');

describe('GithubAdapterService', () => {
  let service: GithubAdapterService;
  let prisma: PrismaService;
  let redis: any;

  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockPrisma = {
    githubProfile: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GithubAdapterService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: 'REDIS', useValue: mockRedis },
      ],
    }).compile();

    service = module.get<GithubAdapterService>(GithubAdapterService);
    prisma = module.get<PrismaService>(PrismaService);
    redis = module.get('REDIS');

    process.env.AUTH_ENCRYPTION_KEY = 'a'.repeat(64);
  });

  describe('decryptToken', () => {
    it('should call decrypt with correct parameters and strip v1:', async () => {
      const encrypted = 'v1:abc:123:xyz';
      (cryptoUtils.decrypt as jest.Mock).mockReturnValue('decrypted-token');
      
      const result = (service as any).decryptToken(encrypted);
      
      expect(cryptoUtils.decrypt).toHaveBeenCalledWith('abc:123:xyz', expect.any(String));
      expect(result).toBe('decrypted-token');
    });
  });

  describe('withCache', () => {
    it('should return cached value if present', async () => {
      redis.get.mockResolvedValue(JSON.stringify({ data: 'cached' }));
      const fetcher = jest.fn();
      
      const result = await (service as any).withCache('test-key', fetcher);
      
      expect(result).toEqual({ data: 'cached' });
      expect(fetcher).not.toHaveBeenCalled();
    });

    it('should fetch and cache value if not present', async () => {
      redis.get.mockResolvedValue(null);
      const fetcher = jest.fn().mockResolvedValue({ data: 'fresh' });
      
      const result = await (service as any).withCache('test-key', fetcher);
      
      expect(result).toEqual({ data: 'fresh' });
      expect(redis.set).toHaveBeenCalledWith('test-key', JSON.stringify({ data: 'fresh' }), 'EX', 86400);
    });
  });

  describe('withRetry', () => {
    it('should retry on 429 then succeed', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce({ status: 429 })
        .mockRejectedValueOnce({ status: 429 })
        .mockResolvedValue({ data: 'success' });
      
      const result = await (service as any).withRetry(fn, 3, 1); // small delay for tests
      
      expect(result).toEqual({ data: 'success' });
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });

  describe('syncProfile', () => {
    it('should fetch all data and update prisma', async () => {
      const profile = {
        id: 'p1',
        githubUserId: 'u1',
        githubUsername: 'user1',
        encryptedToken: 'v1:token',
      };
      
      mockPrisma.githubProfile.findUnique.mockResolvedValue(profile);
      (cryptoUtils.decrypt as jest.Mock).mockReturnValue('token');
      
      redis.get.mockResolvedValue(null); // Force fetch
      
      // Mock Octokit instance
      const mockOctokitInstance = {
        rest: {
          repos: {
            listForAuthenticatedUser: jest.fn().mockResolvedValue({ data: [] }),
            listLanguages: jest.fn().mockResolvedValue({ data: {} }),
            listCommits: jest.fn().mockResolvedValue({ data: [] }),
          },
          activity: {
            listPublicEventsForUser: jest.fn().mockResolvedValue({ data: [] }),
          },
        },
        graphql: jest.fn().mockResolvedValue({
          user: {
            pullRequests: { nodes: [] },
            reviewsGiven: { nodes: [] },
            contributionsCollection: { contributionCalendar: {} },
          },
        }),
      };
      // (Octokit as unknown as jest.Mock)
MockOctokit.mockImplementation(() => mockOctokitInstance);

      await service.syncProfile('p1');

      expect(mockPrisma.githubProfile.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: expect.objectContaining({
          syncStatus: SyncStatus.DONE,
          syncProgress: 100,
        }),
      });
      
      expect(cryptoUtils.decrypt).toHaveBeenCalled();
    });
  });
});
