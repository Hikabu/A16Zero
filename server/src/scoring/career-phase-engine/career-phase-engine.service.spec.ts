import { CareerPhaseEngineService } from './career-phase-engine.service';
import { GithubRawDataSnapshot } from '../github-adapter/types';

describe('CareerPhaseEngineService', () => {
  let service: CareerPhaseEngineService;

  beforeEach(() => {
    service = new CareerPhaseEngineService();
  });

  const buildData = (commits: any[] = [], prs: any[] = [], reviews: any[] = []): GithubRawDataSnapshot => ({
    rest: {
      repos: [],
      languages: {},
      commits: { 'repo1': commits }
    },
    graphql: {
      pullRequests: prs,
      reviewsGiven: reviews,
      contributionCalendar: {}
    },
    events: { events: [] },
    fetchedAt: '2024-01-01T00:00:00Z'
  });

  it('should detect a career gap of 8 months', () => {
    // 2022-01 to 2022-03: Active
    // 2022-04 to 2022-11: Inactive (8 months)
    // 2022-12: Active
    const commits = [
      { commit: { author: { date: '2022-01-15T00:00:00Z' } } },
      { commit: { author: { date: '2022-02-15T00:00:00Z' } } },
      { commit: { author: { date: '2022-03-15T00:00:00Z' } } },
      { commit: { author: { date: '2022-12-15T00:00:00Z' } } },
    ];

    const data = { ...buildData(commits), fetchedAt: '2023-01-01T00:00:00Z' };
    const result = service.compute(data, '2022-01-01T00:00:00Z');

    expect(result.careerGapDetected).toBe(true);
    expect(result.longestGapMonths).toBe(8);
    expect(result.gapEvents[0].startMonth).toBe('2022-04');
    expect(result.gapEvents[0].endMonth).toBe('2022-11');
  });

  it('should identify the peak 24-month window correctly', () => {
    // Phase 1: 2020-01 to 2021-12 (24 months) - High activity
    // Phase 2: 2022-01 to 2023-12 (24 months) - Low activity
    const commits: any[] = [];
    for (let i = 0; i < 24; i++) {
        const d = new Date(2020, i, 15);
        commits.push({ commit: { author: { date: d.toISOString() } } });
        commits.push({ commit: { author: { date: d.toISOString() } } }); // 2 commits/month
    }
    for (let i = 0; i < 24; i++) {
        const d = new Date(2022, i, 15);
        commits.push({ commit: { author: { date: d.toISOString() } } }); // 1 commit/month
    }

    const data = buildData(commits);
    const result = service.compute(data, '2020-01-01T00:00:00Z');

    expect(result.peakWindow.startMonth).toBe('2020-01');
    expect(result.peakWindow.endMonth).toBe('2021-12');
  });

  it('should detect RETURNING trajectory', () => {
    // Prior 6 months: 0 score
    // Recent 6 months: 10 score
    const commits: any[] = [];
    const now = new Date('2024-01-01T00:00:00Z');
    
    // Recent 3 months
    for (let i = 0; i < 3; i++) {
        const d = new Date(now);
        d.setMonth(now.getMonth() - i);
        commits.push({ commit: { author: { date: d.toISOString() } } });
        commits.push({ commit: { author: { date: d.toISOString() } } });
    }

    const data = buildData(commits);
    // Overlap with fetchedAt
    const dataWithFetch = { ...data, fetchedAt: '2024-01-01T00:00:00Z' };
    const result = service.compute(dataWithFetch, '2023-01-01T00:00:00Z');

    expect(result.trajectory).toBe('RETURNING');
  });

  it('should detect ASCENDING trajectory', () => {
    const commits: any[] = [];
    // Prior 6 months: 5 commits
    for (let i = 6; i < 12; i++) {
        const d = new Date(2023, 11 - i, 15);
        commits.push({ commit: { author: { date: d.toISOString() } } });
    }
    // Recent 6 months: 20 commits
    for (let i = 0; i < 6; i++) {
        const d = new Date(2023, 11 - i, 15);
        commits.push({ commit: { author: { date: d.toISOString() } } });
        commits.push({ commit: { author: { date: d.toISOString() } } });
        commits.push({ commit: { author: { date: d.toISOString() } } });
        commits.push({ commit: { author: { date: d.toISOString() } } });
    }

    const data = buildData(commits);
    const dataWithFetch = { ...data, fetchedAt: '2024-01-01T00:00:00Z' };
    const result = service.compute(dataWithFetch, '2023-01-01T00:00:00Z');

    expect(result.trajectory).toBe('ASCENDING');
  });
});
