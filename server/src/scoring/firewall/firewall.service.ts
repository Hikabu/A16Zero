import { Injectable } from '@nestjs/common';
import { 
  FirewallResult, 
  GithubRawData, 
  FraudTier, 
  RemovedRepo, 
  FlaggedRepo, 
  FirewallLogEntry 
} from './types';

@Injectable()
export class FirewallService {
  /**
   * Processes raw GitHub data through five filters to identify low-signal or fraudulent activity.
   */
  process(githubUsername: string, accountCreatedAt: string, data: GithubRawData): FirewallResult {
    const result: FirewallResult = {
      cleanedData: JSON.parse(JSON.stringify(data)), // Deep clone for immutability
      removedRepos: [],
      flaggedRepos: [],
      fraudScore: 0,
      fraudTier: FraudTier.CLEAN,
      firewallLog: [],
    };

    const accountCreatedDate = new Date(accountCreatedAt);

    // Filter 1: ZeroEffortForkFilter
    this.applyZeroEffortForkFilter(githubUsername, result);

    // Filter 2: TutorialRepoFilter
    this.applyTutorialRepoFilter(accountCreatedDate, result);

    // Filter 3: BotPatternFilter
    this.applyBotPatternFilter(result);

    // Filter 4: GreenWallFilter
    this.applyGreenWallFilter(result);

    // Filter 5: HackathonDetector
    this.applyHackathonDetector(result);

    // Calculate final fraud score and tier
    result.fraudScore = Math.min(1, result.flaggedRepos.reduce((acc, f) => acc + f.fraudScoreIncrement, 0));
    
    if (result.fraudScore >= 0.6) {
      result.fraudTier = FraudTier.LIKELY_FRAUDULENT;
    } else if (result.fraudScore >= 0.3) {
      result.fraudTier = FraudTier.SUSPICIOUS;
    } else {
      result.fraudTier = FraudTier.CLEAN;
    }

    return result;
  }

  private applyZeroEffortForkFilter(githubUsername: string, result: FirewallResult) {
    const repos = result.cleanedData.rest.repos;
    const commits = result.cleanedData.rest.commits;

    for (let i = repos.length - 1; i >= 0; i--) {
      const repo = repos[i];
      if (repo.fork) {
        const repoCommits = commits[repo.id.toString()] || [];
        const hasOriginalCommit = repoCommits.some(c => 
          c.author?.login === githubUsername || 
          c.commit?.author?.name === githubUsername || 
          c.commit?.committer?.name === githubUsername
        );

        if (!hasOriginalCommit) {
          result.removedRepos.push({
            repoId: repo.id.toString(),
            repoName: repo.name,
            reason: 'Zero-effort fork — no original commits',
          });
          result.firewallLog.push({
            filter: 'ZeroEffortForkFilter',
            action: 'REMOVED',
            repoId: repo.id.toString(),
            reason: 'Zero-effort fork — no original commits',
          });
          repos.splice(i, 1);
        }
      }
    }
  }

  private applyTutorialRepoFilter(accountCreatedDate: Date, result: FirewallResult) {
    const repos = result.cleanedData.rest.repos;
    const fileTrees = result.cleanedData.rest.fileTrees || {};

    for (const repo of repos) {
      const files = fileTrees[repo.id.toString()] || [];
      const hasRootIndex = files.some(f => f === 'index.html' || f === 'index.js');
      const hasRootStyle = files.some(f => f === 'style.css' || f === 'app.css' || f === 'styles.css');
      const hasNoTests = !files.some(f => 
        f.endsWith('.test.js') || 
        f.endsWith('.test.ts') || 
        f.endsWith('.spec.js') || 
        f.endsWith('.spec.ts') || 
        f.includes('__tests__/') || 
        f.includes('/test/')
      );
      
      const repoCreatedDate = new Date(repo.created_at || repo.createdAt);
      const diffDays = Math.abs(repoCreatedDate.getTime() - accountCreatedDate.getTime()) / (1000 * 3600 * 24);
      const within180Days = diffDays <= 180;

      if (hasRootIndex && hasRootStyle && hasNoTests && within180Days) {
        repo.tutorialWeight = 0.3;
        result.firewallLog.push({
          filter: 'TutorialRepoFilter',
          action: 'DE_WEIGHTED',
          repoId: repo.id.toString(),
          reason: 'Identified as tutorial project (30% weight)',
        });
      }
    }
  }

  private applyBotPatternFilter(result: FirewallResult) {
    const repos = result.cleanedData.rest.repos;
    const commitsMap = result.cleanedData.rest.commits;

    for (const repo of repos) {
      const commits = commitsMap[repo.id.toString()] || [];
      if (commits.length === 0) continue;

      let fraudScoreIncTotal = 0;
      const flags: string[] = [];

      // Burst Detection: > 50 commits in any 3-hour rolling window
      const sortedCommits = [...commits].sort((a, b) => 
        new Date(a.commit?.author?.date || a.created_at).getTime() - 
        new Date(b.commit?.author?.date || b.created_at).getTime()
      );

      let hasBurst = false;
      for (let i = 0; i < sortedCommits.length; i++) {
        const startTime = new Date(sortedCommits[i].commit?.author?.date || sortedCommits[i].created_at).getTime();
        let count = 0;
        for (let j = i; j < sortedCommits.length; j++) {
          const commitTime = new Date(sortedCommits[j].commit?.author?.date || sortedCommits[j].created_at).getTime();
          if (commitTime - startTime <= 3 * 3600 * 1000) {
            count++;
          } else {
            break;
          }
        }
        if (count > 50) {
          hasBurst = true;
          break;
        }
      }

      if (hasBurst) {
        fraudScoreIncTotal += 0.25;
        flags.push('BOT_BURST');
      }

      // Uniform Messages: > 80% consecutive Levenshtein < 5
      let uniformCount = 0;
      for (let i = 0; i < commits.length - 1; i++) {
        const msg1 = commits[i].commit?.message || '';
        const msg2 = commits[i+1].commit?.message || '';
        if (this.levenshtein(msg1, msg2) < 5) {
          uniformCount++;
        }
      }
      if (commits.length > 1 && (uniformCount / (commits.length - 1)) > 0.8) {
        fraudScoreIncTotal += 0.25;
        flags.push('UNIFORM_MESSAGES');
      }

      // Weekend Pattern: > 70% Sat 00:00 - Sun 06:00 UTC
      let weekendCount = 0;
      for (const c of commits) {
        const date = new Date(c.commit?.author?.date || c.created_at);
        const day = date.getUTCDay(); // 0 = Sun, 6 = Sat
        const hour = date.getUTCHours();
        
        // Sat 00:00 - Sun 06:00 is:
        // day == 6 (any hour) OR (day == 0 AND hour < 6)
        if (day === 6 || (day === 0 && hour < 6)) {
          weekendCount++;
        }
      }
      if (commits.length > 0 && (weekendCount / commits.length) > 0.7) {
        fraudScoreIncTotal += 0.15;
        flags.push('WEEKEND_PATTERN');
      }

      if (flags.length > 0) {
        repo.excludeFromSignals = true;
        result.flaggedRepos.push({
          repoId: repo.id.toString(),
          repoName: repo.name,
          flag: flags.join(', '),
          fraudScoreIncrement: fraudScoreIncTotal,
        });
        result.firewallLog.push({
          filter: 'BotPatternFilter',
          action: 'FLAGGED',
          repoId: repo.id.toString(),
          reason: `Flagged for bot patterns: ${flags.join(', ')}`,
        });
      }
    }
  }

  private applyGreenWallFilter(result: FirewallResult) {
    const commitsMap = result.cleanedData.rest.commits;

    for (const repoId in commitsMap) {
      const commits = commitsMap[repoId];
      for (const c of commits) {
        const stats = c.stats || { total: 0 };
        const diffSize = stats.total;
        const msg = (c.commit?.message || '').toLowerCase().trim();
        
        const lowValueMessages = ['update', 'wip', '.'];
        const isLowValue = lowValueMessages.includes(msg) || 
                          msg.length <= 3 || 
                          (msg.length > 0 && msg.split('').every(char => char === msg[0]));
        
        if (diffSize < 5 && isLowValue) {
          c.streakOnly = true;
        }
      }
    }
  }

  private applyHackathonDetector(result: FirewallResult) {
    const repos = result.cleanedData.rest.repos;
    const commitsMap = result.cleanedData.rest.commits;

    const hackathonKeywords = ['hackathon', 'mlh-', '-hack', 'buildathon', '24h', '48h', '72h'];

    for (const repo of repos) {
      // Name check
      const nameMatches = hackathonKeywords.some(kw => repo.name.toLowerCase().includes(kw));
      
      // Activity burst check: > 40 commits in 72h window AND < 3 commits in next 30 days
      const commits = commitsMap[repo.id.toString()] || [];
      const sortedCommits = [...commits].sort((a, b) => 
        new Date(a.commit?.author?.date || a.created_at).getTime() - 
        new Date(b.commit?.author?.date || b.created_at).getTime()
      );

      let activityBurst = false;
      for (let i = 0; i < sortedCommits.length; i++) {
        const startTime = new Date(sortedCommits[i].commit?.author?.date || sortedCommits[i].created_at).getTime();
        let count = 0;
        let lastInBurstTime = startTime;
        for (let j = i; j < sortedCommits.length; j++) {
          const commitTime = new Date(sortedCommits[j].commit?.author?.date || sortedCommits[j].created_at).getTime();
          if (commitTime - startTime <= 72 * 3600 * 1000) {
            count++;
            lastInBurstTime = commitTime;
          } else {
            break;
          }
        }

        if (count > 40) {
          // Check subsequent 30 days
          const afterBurstStart = lastInBurstTime;
          const afterBurstEnd = lastInBurstTime + 30 * 24 * 3600 * 1000;
          const subsequentCommits = sortedCommits.filter(c => {
            const time = new Date(c.commit?.author?.date || c.created_at).getTime();
            return time > afterBurstStart && time <= afterBurstEnd;
          });

          if (subsequentCommits.length < 3) {
            activityBurst = true;
            break;
          }
        }
      }

      if (nameMatches || activityBurst) {
        repo.repoType = 'HACKATHON';
        result.firewallLog.push({
          filter: 'HackathonDetector',
          action: 'LABELLED',
          repoId: repo.id.toString(),
          reason: `Tagged as HACKATHON (${nameMatches ? 'name match' : 'activity burst'})`,
        });
      }
    }
  }

  private levenshtein(s1: string, s2: string): number {
    if (s1 === s2) return 0;
    const len1 = s1.length;
    const len2 = s2.length;
    if (len1 === 0) return len2;
    if (len2 === 0) return len1;

    const matrix: number[][] = [];
    for (let i = 0; i <= len1; i++) matrix[i] = [i];
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;

    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,      // deletion
                matrix[i][j - 1] + 1,      // insertion
                matrix[i - 1][j - 1] + cost // substitution
            );
        }
    }
    return matrix[len1][len2];
  }
}
