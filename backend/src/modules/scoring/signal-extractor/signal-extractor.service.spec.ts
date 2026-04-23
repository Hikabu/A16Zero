import { SignalExtractorService } from './signal-extractor.service';
import { GitHubRawData, GitHubContributionData } from '../github-adapter/github-data.types';

describe('SignalExtractorService', () => {
  let service: SignalExtractorService;
  const fetchedAt = new Date('2024-04-18T12:00:00Z');

  beforeEach(() => {
    service = new SignalExtractorService();
  });

  const createMockData = (repos: any[], contributions?: Partial<GitHubContributionData>): GitHubRawData => ({
    profile: {
      username: 'testuser',
      accountCreatedAt: new Date('2020-01-01'),
      accountAge: 51,
      publicRepos: repos.length,
      followers: 10,
    },
    repos: repos.map(r => ({
      name: r.name || 'repo',
      language: r.language !== undefined ? r.language : 'TypeScript',
      stars: r.stars !== undefined ? r.stars : 10,
      forks: r.forks !== undefined ? r.forks : 5,
      topics: r.topics || [],
      createdAt: new Date(r.createdAt || '2023-01-01'),
      pushedAt: new Date(r.pushedAt || '2024-04-18'),
      isFork: r.isFork ?? false,
      description: 'desc',
    })),
    contributions: {
      weeklyTotals: contributions?.weeklyTotals ?? Array(52).fill(0),
      activeWeeksCount: contributions?.activeWeeksCount ?? 0,
    },
    externalPRs: { mergedExternalPRCount: 0, externalRepoNames: [] },
    fetchedAt,
  });

  describe('S1: Ownership Depth', () => {
    it('should count a repo that is old enough and recently pushed to', () => {
      const data = createMockData([
        { createdAt: '2023-01-01', pushedAt: '2024-04-10' }, // 15 months old, pushed 8 days ago
      ]);
      const signals = service.extract(data);
      expect(signals.ownershipDepth).toBe(1);
    });

    it('should exclude forks', () => {
      const data = createMockData([
        { createdAt: '2023-01-01', pushedAt: '2024-04-10', isFork: true },
      ]);
      const signals = service.extract(data);
      expect(signals.ownershipDepth).toBe(0);
    });

    it('should exclude repos created less than 3 months ago', () => {
      const data = createMockData([
        { createdAt: '2024-02-18', pushedAt: '2024-04-10' }, // Exactly 2 months old (60 days)
      ]);
      const signals = service.extract(data);
      expect(signals.ownershipDepth).toBe(0);
    });

    it('should exclude repos pushed to more than 3 months ago', () => {
      const data = createMockData([
        { createdAt: '2023-01-01', pushedAt: '2024-01-01' }, // 108 days ago
      ]);
      const signals = service.extract(data);
      expect(signals.ownershipDepth).toBe(0);
    });

    it('should count multiple qualifying repos correctly', () => {
      const data = createMockData([
        { createdAt: '2023-01-01', pushedAt: '2024-04-10' },
        { createdAt: '2022-01-01', pushedAt: '2024-04-01' },
        { createdAt: '2024-01-01', pushedAt: '2024-04-10' }, // Not 90 days old (108 days diff? Let's check: Jan to April is ~107. Ok, this IS qualifying)
        { createdAt: '2024-03-01', pushedAt: '2024-04-10' }, // 48 days old. NOT qualifying.
      ]);
      // S1 criteria: createdAt < 2024-01-19 (90 days before April 18)
      // Jan 1st is qualifying. March 1st is NOT.
      const signals = service.extract(data);
      expect(signals.ownershipDepth).toBe(3);
    });
  });

  describe('S2: Project Longevity', () => {
    it('should return 24.0 for a single qualifying repo created 24 months ago', () => {
      // 24 * 30.44 = 730.56 days. 
      const createdAt = new Date(fetchedAt.getTime() - (24 * 30.44 * 24 * 60 * 60 * 1000));
      const data = createMockData([
        { createdAt: createdAt.toISOString(), pushedAt: fetchedAt.toISOString() },
      ]);
      const signals = service.extract(data);
      expect(signals.projectLongevity).toBe(24.0);
    });

    it('should average multiple repos correctly and round to 1 decimal', () => {
      // Repos with 12 and 36 months age
      const date12 = new Date(fetchedAt.getTime() - (12 * 30.44 * 24 * 60 * 60 * 1000));
      const date36 = new Date(fetchedAt.getTime() - (36 * 30.44 * 24 * 60 * 60 * 1000));
      const data = createMockData([
        { createdAt: date12.toISOString(), pushedAt: fetchedAt.toISOString() },
        { createdAt: date36.toISOString(), pushedAt: fetchedAt.toISOString() },
      ]);
      const signals = service.extract(data);
      expect(signals.projectLongevity).toBe(24.0);
    });

    it('should use a more lenient 6-month activity threshold for S2', () => {
      // Created 1 year ago, pushed 5 months (150 days) ago.
      // Qualifies for S2 (limit 180), NOT for S1 (limit 90).
      const createdAt = new Date(fetchedAt.getTime() - (365 * 24 * 60 * 60 * 1000));
      const pushedAt = new Date(fetchedAt.getTime() - (150 * 24 * 60 * 60 * 1000));
      const data = createMockData([
        { createdAt: createdAt.toISOString(), pushedAt: pushedAt.toISOString() },
      ]);
      const signals = service.extract(data);
      expect(signals.ownershipDepth).toBe(0);
      expect(signals.projectLongevity).toBeGreaterThan(0);
    });

    it('should return 0 if no qualifying repos', () => {
      const data = createMockData([]);
      const signals = service.extract(data);
      expect(signals.projectLongevity).toBe(0);
    });
  });

  describe('S3: Activity Consistency', () => {
    it('should return 0.0 if zero active weeks', () => {
      const data = createMockData([], { activeWeeksCount: 0 });
      const signals = service.extract(data);
      expect(signals.activityConsistency).toBe(0);
    });

    it('should return 1.0 if all weeks are active', () => {
      const data = createMockData([], { activeWeeksCount: 52 });
      const signals = service.extract(data);
      expect(signals.activityConsistency).toBe(1.0);
    });

    it('should return 0.500 for 26 active weeks', () => {
      const data = createMockData([], { activeWeeksCount: 26 });
      const signals = service.extract(data);
      expect(signals.activityConsistency).toBe(0.5);
    });
  });

  describe('getTrend()', () => {
    it('should return ascending if last block avg > first block avg * 1.2', () => {
      const weeklyTotals = Array(52).fill(1);
      // first 17 avg = 1
      // last 17 block: change to 3
      for (let i = 35; i < 52; i++) weeklyTotals[i] = 3;
      
      const trend = service.getTrend({ weeklyTotals, activeWeeksCount: 17 } as any);
      expect(trend).toBe('ascending');
    });

    it('should return declining if last block avg < first block avg * 0.8', () => {
      const weeklyTotals = Array(52).fill(10);
      // first 17 avg = 10
      // last 17 block: change to 5
      for (let i = 35; i < 52; i++) weeklyTotals[i] = 5;
      
      const trend = service.getTrend({ weeklyTotals, activeWeeksCount: 52 } as any);
      expect(trend).toBe('declining');
    });

    it('should return stable if within 20% range', () => {
      const weeklyTotals = Array(52).fill(10);
      // first 17 avg = 10
      // last 17 block: change to 11 (1.1x)
      for (let i = 35; i < 52; i++) weeklyTotals[i] = 11;
      
      const trend = service.getTrend({ weeklyTotals, activeWeeksCount: 52 } as any);
      expect(trend).toBe('stable');
    });

    it('should handle first block avg being 0 with simplest high signal approach', () => {
      const weeklyTotals = Array(52).fill(0);
      for (let i = 35; i < 52; i++) weeklyTotals[i] = 1; // Activity in last block
      
      const trend = service.getTrend({ weeklyTotals, activeWeeksCount: 17 } as any);
      expect(trend).toBe('ascending');
    });

    it('should return stable if both blocks are all zero', () => {
      const weeklyTotals = Array(52).fill(0);
      const trend = service.getTrend({ weeklyTotals, activeWeeksCount: 0 } as any);
      expect(trend).toBe('stable');
    });
  });

  describe('S4: Tech Stack Breadth', () => {
    it('should count unique languages across non-fork repos', () => {
      const data = createMockData([
        { language: 'TypeScript', isFork: false },
        { language: 'JavaScript', isFork: false },
        { language: 'typescript', isFork: false }, // case-insensitive dedupe
        { language: 'Python', isFork: true },      // exclude forks
        { language: null, isFork: false },         // exclude null
      ]);
      const signals = service.extract(data);
      expect(signals.techStackBreadth).toBe(2);
    });
  });

  describe('S5: External Contributions', () => {
    it('should pass through mergedExternalPRCount', () => {
      const data = createMockData([]);
      (data as any).externalPRs = { mergedExternalPRCount: 42, externalRepoNames: [] };
      const signals = service.extract(data);
      expect(signals.externalContributions).toBe(42);
    });
  });

  describe('S6: Project Meaningfulness', () => {
    it('should calculate normalized composite score correctly', () => {
      // One repo: ln(10+1)*2 + ln(5+1)*1.5 + 1 = 4.7957 + 2.6876 + 1 = 8.4833
      // Normalization: 8.4833 / (1 * 10) = 0.84833 => 0.848
      const data = createMockData([
        { stars: 10, forks: 5, topics: ['tag'], isFork: false }
      ]);
      const signals = service.extract(data);
      expect(signals.projectMeaningfulness).toBe(0.848);
    });

    it('should return 0 if no non-fork repos', () => {
      const data = createMockData([{ isFork: true }]);
      const signals = service.extract(data);
      expect(signals.projectMeaningfulness).toBe(0);
    });
  });

  describe('S7: Stack Identity', () => {
    it('should return top 2 languages by count with alphabetical tie-break', () => {
      const data = createMockData([
        { language: 'TypeScript', isFork: false },
        { language: 'TypeScript', isFork: false },
        { language: 'Go', isFork: false },
        { language: 'Go', isFork: false },
        { language: 'Python', isFork: false },
      ]);
      const signals = service.extract(data);
      // Go and TypeScript have 2 each. Alphabetical: Go, TypeScript.
      expect(signals.stackIdentity).toEqual(['Go', 'TypeScript']);
    });
  });

  describe('S8: Data Completeness', () => {
    it('should reach 1.0 with high metrics', () => {
      const data = createMockData([], { activeWeeksCount: 15 });
      data.profile.publicRepos = 15;
      data.profile.accountAge = 36;
      const signals = service.extract(data);
      // factorA(1.0*0.4) + factorB(1.0*0.4) + factorC(1.0*0.2) = 1.0
      expect(signals.dataCompleteness).toBe(1.0);
    });

    it('should reach lower score with minimal metrics', () => {
      const data = createMockData([], { activeWeeksCount: 0 });
      data.profile.publicRepos = 1;
      data.profile.accountAge = 6;
      const signals = service.extract(data);
      // factorA(0*0.7) + factorB(0.2*0.15) + factorC(0.1*0.15) = 0 + 0.03 + 0.015 = 0.045
      expect(signals.dataCompleteness).toBe(0.045);
    });
  });

  describe('detectPrivateWorkIndicators()', () => {
    it('should return true if consistency > 0.5 and completeness < 0.4', () => {
      const signals = {
        activityConsistency: 0.6,
        dataCompleteness: 0.3,
      } as any;
      expect(service.detectPrivateWorkIndicators(signals)).toBe(true);
    });

    it('should return false if consistency <= 0.5', () => {
      const signals = {
        activityConsistency: 0.5,
        dataCompleteness: 0.3,
      } as any;
      expect(service.detectPrivateWorkIndicators(signals)).toBe(false);
    });

    it('should return false if completeness >= 0.4', () => {
      const signals = {
        activityConsistency: 0.6,
        dataCompleteness: 0.4,
      } as any;
      expect(service.detectPrivateWorkIndicators(signals)).toBe(false);
    });
  });
});
