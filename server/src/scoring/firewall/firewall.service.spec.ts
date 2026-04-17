import { FirewallService } from './firewall.service';
import { FraudTier, GithubRawData } from './types';

describe('FirewallService', () => {
  let service: FirewallService;
  const username = 'testuser';
  const accountCreated = '2024-01-01T00:00:00Z';

  beforeEach(() => {
    service = new FirewallService();
  });

  const createBaseData = (): GithubRawData => ({
    rest: {
      repos: [],
      languages: {},
      commits: {},
      fileTrees: {},
    },
    graphql: {
      pullRequests: [],
      reviewsGiven: [],
      contributionCalendar: {},
    },
    events: {
      events: [],
    },
    fetchedAt: new Date().toISOString(),
  });

  it('Case 1: Pure fork (fork=true, 0 original commits)', () => {
    const data = createBaseData();
    data.rest.repos.push({ id: 1, name: 'fork-repo', fork: true });
    data.rest.commits['1'] = [{ sha: 'a', author: { login: 'other' } }]; // No testuser commit

    const result = service.process(username, accountCreated, data);
    expect(result.removedRepos).toContainEqual(expect.objectContaining({ repoId: '1' }));
    expect(result.cleanedData.rest.repos).toHaveLength(0);
  });

  it('Case 2: Fork with 1 original commit', () => {
    const data = createBaseData();
    data.rest.repos.push({ id: 1, name: 'fork-repo', fork: true });
    data.rest.commits['1'] = [{ sha: 'a', author: { login: username } }];

    const result = service.process(username, accountCreated, data);
    expect(result.removedRepos).toHaveLength(0);
    expect(result.cleanedData.rest.repos).toHaveLength(1);
  });

  it('Case 3: Tutorial repo (all 4 conditions met)', () => {
    const data = createBaseData();
    // Created within 180 days of account (2024-01-01)
    data.rest.repos.push({ id: 1, name: 'tutorial', created_at: '2024-02-01T00:00:00Z' });
    data.rest.fileTrees!['1'] = ['index.html', 'style.css', 'README.md']; // index + style, no tests

    const result = service.process(username, accountCreated, data);
    expect(result.cleanedData.rest.repos[0].tutorialWeight).toBe(0.3);
    const log = result.firewallLog.find(l => l.filter === 'TutorialRepoFilter');
    expect(log?.action).toBe('DE_WEIGHTED');
  });

  it('Case 4: Bot burst (55 commits in 2h)', () => {
    const data = createBaseData();
    data.rest.repos.push({ id: 1, name: 'burst-repo' });
    const startTime = new Date('2024-03-01T10:00:00Z').getTime();
    data.rest.commits['1'] = Array.from({ length: 55 }, (_, i) => ({
      sha: `s${i}`,
      commit: { author: { date: new Date(startTime + i * 60000).toISOString() } } // 1 commit per min
    }));

    const result = service.process(username, accountCreated, data);
    expect(result.cleanedData.rest.repos[0].excludeFromSignals).toBe(true);
    expect(result.fraudScore).toBeGreaterThanOrEqual(0.25);
    expect(result.flaggedRepos[0].flag).toContain('BOT_BURST');
  });

  it('Case 5: Uniform messages (85% identical)', () => {
    const data = createBaseData();
    data.rest.repos.push({ id: 1, name: 'uniform-repo' });
    data.rest.commits['1'] = Array.from({ length: 10 }, () => ({
      sha: Math.random().toString(),
      commit: { message: 'update file.txt' } // Identical messages
    }));

    const result = service.process(username, accountCreated, data);
    expect(result.fraudScore).toBeGreaterThanOrEqual(0.25);
    expect(result.flaggedRepos[0].flag).toContain('UNIFORM_MESSAGES');
  });

  it('Case 6: Weekend pattern only (75% weekend)', () => {
    const data = createBaseData();
    data.rest.repos.push({ id: 1, name: 'weekend-repo' });
    // Saturday is day 6. Sat 10:00 AM UTC.
    data.rest.commits['1'] = Array.from({ length: 10 }, (_, i) => ({
      sha: Math.random().toString(),
      commit: { 
        author: { date: '2024-03-02T10:00:00Z' },
        message: i % 2 === 0 ? "Something very different" : "Another quite unique thing"
      } 
    }));

    const result = service.process(username, accountCreated, data);
    expect(result.fraudScore).toBe(0.15);
    expect(result.fraudTier).toBe(FraudTier.CLEAN);
  });

  it('Case 7: Green-wall commit (3-char message, 2 lines diff)', () => {
    const data = createBaseData();
    data.rest.repos.push({ id: 1, name: 'green-repo' });
    data.rest.commits['1'] = [{
      sha: 'g1',
      commit: { message: 'fix' },
      stats: { total: 2 }
    }];

    const result = service.process(username, accountCreated, data);
    expect(result.cleanedData.rest.commits['1'][0].streakOnly).toBe(true);
  });

  it('Case 8: Hackathon by name ("my-hackathon-project")', () => {
    const data = createBaseData();
    data.rest.repos.push({ id: 1, name: 'my-hackathon-project' });

    const result = service.process(username, accountCreated, data);
    expect(result.cleanedData.rest.repos[0].repoType).toBe('HACKATHON');
    expect(result.fraudScore).toBe(0);
  });

  it('Case 9: Hackathon by burst (45 commits in 48h, 1 commit in next 30 days)', () => {
    const data = createBaseData();
    data.rest.repos.push({ id: 1, name: 'burst-hack' });
    const burstStart = new Date('2024-04-01T00:00:00Z').getTime();
    const burstCommits = Array.from({ length: 45 }, (_, i) => ({
      sha: `b${i}`,
      commit: { author: { date: new Date(burstStart + i * 1800000).toISOString() } } // Every 30 mins -> 45 commits in ~22h
    }));
    const quietCommit = {
      sha: 'quiet',
      commit: { author: { date: new Date(burstStart + 10 * 24 * 3600 * 1000).toISOString() } } // 10 days later
    };
    data.rest.commits['1'] = [...burstCommits, quietCommit];

    const result = service.process(username, accountCreated, data);
    expect(result.cleanedData.rest.repos[0].repoType).toBe('HACKATHON');
  });

  it('Case 10: FraudTier boundaries', () => {
    const data = createBaseData();
    // Mock 2 flags to get 0.50
    data.rest.repos.push({ id: 1, name: 'suspicious-repo' });
    const startTime = new Date('2024-03-01T10:00:00Z').getTime();
    const burstMessages = Array.from({ length: 60 }, (_, i) => ({
      sha: `s${i}`,
      commit: { 
        author: { date: new Date(startTime + i * 1000).toISOString() },
        message: 'uniform'
      }
    }));
    data.rest.commits['1'] = burstMessages;

    const result = service.process(username, accountCreated, data);
    // BURST (0.25) + UNIFORM (0.25) = 0.50
    expect(result.fraudScore).toBe(0.5);
    expect(result.fraudTier).toBe(FraudTier.SUSPICIOUS);

    data.rest.repos.push({ id: 2, name: 'very-fraudulent' });
    data.rest.commits['2'] = Array.from({ length: 10 }, (_, i) => ({
      sha: Math.random().toString(),
      // Sat 10:00 AM UTC
      commit: { 
        author: { date: '2024-03-02T10:00:00Z' },
        message: i % 2 === 0 ? "Something very different" : "Another quite unique thing"
      }
    }));
    
    // Result check with both flagged
    const result2 = service.process(username, accountCreated, data);
    // 0.50 + 0.15 = 0.65
    expect(result2.fraudScore).toBe(0.65);
    expect(result2.fraudTier).toBe(FraudTier.LIKELY_FRAUDULENT);
  });
});
