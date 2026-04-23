import { Test, TestingModule } from '@nestjs/testing';
import { AchievementWhitelistService } from '../achievement-whitelist.service';
import { SolanaAdapterService } from '../solana-adapter.service';
import { ConfigService } from '@nestjs/config';
import { SummaryGeneratorService } from '../../summary-generator/summary-generator.service';
import { AnalysisResult } from '../../types/result.types';
import * as fs from 'fs';

jest.mock('fs');

describe('AchievementWhitelistService and SolanaAdapterService Integration', () => {
  let whitelistService: AchievementWhitelistService;
  let solanaAdapter: SolanaAdapterService;
  let summaryGenerator: SummaryGeneratorService;
  let mockRedis: any;
  let globalFetch: any;

  beforeEach(async () => {
    (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath.includes('superteam-mints.json')) {
        return JSON.stringify({
          mints: [
            {
              mintAuthority: 'SuperteamAuthority111111111111111111111',
              label: 'Bounty Completion',
              year: 2023,
            },
          ],
        });
      }
      return JSON.stringify({ mints: [] });
    });

    mockRedis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AchievementWhitelistService,
        SolanaAdapterService,
        SummaryGeneratorService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('mock-api-key') },
        },
        { provide: 'REDIS', useValue: mockRedis },
      ],
    }).compile();

    whitelistService = module.get<AchievementWhitelistService>(
      AchievementWhitelistService,
    );
    solanaAdapter = module.get<SolanaAdapterService>(SolanaAdapterService);
    summaryGenerator = module.get<SummaryGeneratorService>(
      SummaryGeneratorService,
    );

    globalFetch = jest.fn();
    global.fetch = globalFetch;

    // Call onModuleInit manually just in case
    whitelistService.onModuleInit();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('AchievementWhitelistService', () => {
    it('returns superteam match if mintAuthority matches', () => {
      const match = whitelistService.matchSuperteam(
        'SuperteamAuthority111111111111111111111',
      );
      expect(match).toEqual({
        mintAuthority: 'SuperteamAuthority111111111111111111111',
        label: 'Bounty Completion',
        year: 2023,
      });
    });

    it('returns null if no matching mintAuthority', () => {
      const matchS = whitelistService.matchSuperteam('UnknownAuthority');
      expect(matchS).toBeNull();
    });
  });

  describe('SolanaAdapterService.fetchAchievements', () => {
    it('returns achievements length: 1 with type: bounty_completion when API returns 1 asset with superteam mintAuthority', async () => {
      globalFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          result: {
            items: [
              {
                authorities: [
                  { address: 'SuperteamAuthority111111111111111111111' },
                ],
              },
            ],
          },
        }),
      });

      const achievements = await solanaAdapter.fetchAchievements('SomeWallet');
      expect(achievements.length).toBe(1);
      expect(achievements[0]).toEqual(
        expect.objectContaining({
          type: 'bounty_completion',
          source: 'superteam',
          label: 'Bounty Completion',
          year: 2023,
        }),
      );
    });

    it('returns [] when API returns asset with no matching authority', async () => {
      globalFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          result: {
            items: [{ authorities: [{ address: 'NoMatchAuthority' }] }],
          },
        }),
      });

      const achievements = await solanaAdapter.fetchAchievements('SomeWallet');
      expect(achievements).toEqual([]);
    });

    it('returns [] if fetch throws', async () => {
      globalFetch.mockRejectedValue(new Error('Network error'));
      const achievements = await solanaAdapter.fetchAchievements('SomeWallet');
      expect(achievements).toEqual([]);
    });

    it('returns [] if API returns error body (not ok)', async () => {
      globalFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      });
      const achievements = await solanaAdapter.fetchAchievements('SomeWallet');
      expect(achievements).toEqual([]);
    });
  });

  describe('SummaryGenerator', () => {
    const defaultResult = (): AnalysisResult => ({
      summary: 'Some summary.',
      capabilities: {
        backend: { score: 0.5, confidence: 'medium' },
        frontend: { score: 0.5, confidence: 'medium' },
        devops: { score: 0.1, confidence: 'low' },
      },
      ownership: { activelyMaintained: 0, ownedProjects: 0, confidence: 'low' },
      impact: {
        activityLevel: 'low',
        consistency: 'sparse',
        externalContributions: 0,
        confidence: 'low',
      },
      reputation: null,
      stack: { languages: [], tools: [] },
      web3: null,
    });

    it('summary contains "2 completions" when achievements includes 2 bounty_completion', () => {
      const result = defaultResult();
      result.web3 = {
        ecosystem: 'solana',
        ecosystemPRs: 0,
        deployedPrograms: [],
        achievements: [
          {
            type: 'bounty_completion',
            source: 'superteam',
            label: 'Bounty 1',
            year: 2023,
          },
          {
            type: 'bounty_completion',
            source: 'superteam',
            label: 'Bounty 2',
            year: 2023,
          },
        ],
      };
      const summary = summaryGenerator.generate(result);
      expect(summary).toContain(
        'Superteam bounty contributor (2 completions).',
      );
    });

    it('summary includes verified vouches when verifiedVouchCount >= 2', () => {
      const result = defaultResult();
      result.reputation = {
        vouchCount: 3,
        verifiedVouchCount: 2,
        confidence: 'medium',
        vouches: [],
      };
      const summary = summaryGenerator.generate(result);
      expect(summary).toContain('Vouched for by 2 verified developers.');
    });

    it('summary unchanged by achievements logic if achievements []', () => {
      const result = defaultResult();
      result.web3 = {
        ecosystem: 'solana',
        ecosystemPRs: 0,
        deployedPrograms: [],
        achievements: [],
      };
      const summary = summaryGenerator.generate(result);
      expect(summary).not.toContain('Superteam bounty contributor');
      expect(summary).toContain('Active in the Solana ecosystem.');
    });
  });
});
