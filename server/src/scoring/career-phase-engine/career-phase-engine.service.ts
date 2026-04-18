import { Injectable } from '@nestjs/common';
import { GithubRawDataSnapshot } from '../github-adapter/types';
import { 
  CareerPhaseResult, 
  CareerPhase, 
  CareerGap, 
  PeakWindow, 
  Trajectory 
} from './types';

@Injectable()
export class CareerPhaseEngineService {
  /**
   * Computes career phases, gaps, and trajectory from cleaned GitHub data.
   */
  compute(
    cleanedData: GithubRawDataSnapshot,
    accountCreatedAt: string
  ): CareerPhaseResult {
    const fetchedAt = cleanedData.fetchedAt;
    const monthlyMap = this.buildMonthlyActivityMap(cleanedData, accountCreatedAt, fetchedAt);
    
    const phases = this.identifyPhases(monthlyMap);
    const gapEvents = this.identifyGaps(monthlyMap);
    const peakWindow = this.findPeakWindow(monthlyMap);
    const trajectory = this.calculateTrajectory(monthlyMap);

    const longestGapMonths = gapEvents.length > 0 
      ? Math.max(...gapEvents.map(g => g.durationMonths)) 
      : 0;

    return {
      phases,
      gapEvents,
      careerGapDetected: gapEvents.length > 0,
      longestGapMonths,
      careerGapNote: gapEvents.length > 0 ? `Gap noted — not penalised` : null,
      peakWindow,
      trajectory
    };
  }

  private buildMonthlyActivityMap(
    data: GithubRawDataSnapshot,
    start: string,
    end: string
  ): Map<string, { commits: number; prs: number; reviews: number }> {
    const months = new Map<string, { commits: number; prs: number; reviews: number }>();
    
    // Initialize months
    let current = new Date(start);
    const last = new Date(end);
    // Go to first day of month for consistent keys
    current = new Date(current.getFullYear(), current.getMonth(), 1);
    
    while (current <= last) {
      const key = this.toMonthKey(current);
      months.set(key, { commits: 0, prs: 0, reviews: 0 });
      current.setMonth(current.getMonth() + 1);
    }

    // Tally Commits
    Object.values(data.rest.commits).forEach((repoCommits: any[]) => {
      repoCommits.forEach(c => {
        if (c.excludeFromSignals) return;
        const date = new Date(c.commit.author.date);
        const key = this.toMonthKey(date);
        const val = months.get(key);
        if (val) val.commits++;
      });
    });

    // Tally PRs
    data.rest.repos.forEach(repo => {
        // Some PRs might be in Rest or GraphQL. 
        // Based on Step 5, we use signals from cleanedData.
    });

    // Actually, following SignalEngine pattern:
    data.graphql.pullRequests.forEach(pr => {
      if (pr.excludeFromSignals) return;
      const date = new Date(pr.createdAt);
      const key = this.toMonthKey(date);
      const val = months.get(key);
      if (val) val.prs++;
    });

    // Tally Reviews
    data.graphql.reviewsGiven.forEach(rev => {
      const date = new Date(rev.createdAt);
      const key = this.toMonthKey(date);
      const val = months.get(key);
      if (val) val.reviews++;
    });

    return months;
  }

  private identifyPhases(monthlyMap: Map<string, any>): CareerPhase[] {
    const months = Array.from(monthlyMap.keys()).sort();
    if (months.length === 0) return [];

    const phases: CareerPhase[] = [];
    let currentPhase: any = null;

    for (const monthKey of months) {
      const data = monthlyMap.get(monthKey);
      const activityLevel = this.getActivityLevel(data);

      if (!currentPhase || currentPhase.activityLevel !== activityLevel) {
        if (currentPhase) {
          phases.push(currentPhase);
        }
        currentPhase = {
          startMonth: monthKey,
          endMonth: monthKey,
          activityLevel,
          commitCount: data.commits,
          prCount: data.prs
        };
      } else {
        currentPhase.endMonth = monthKey;
        currentPhase.commitCount += data.commits;
        currentPhase.prCount += data.prs;
      }
    }

    if (currentPhase) phases.push(currentPhase);
    return phases;
  }

  private identifyGaps(monthlyMap: Map<string, any>): CareerGap[] {
    const months = Array.from(monthlyMap.keys()).sort();
    const gaps: CareerGap[] = [];
    let currentGapStart: string | null = null;
    let gapCount = 0;

    for (const monthKey of months) {
      const data = monthlyMap.get(monthKey);
      const isInactive = data.commits === 0 && data.prs === 0 && data.reviews === 0;

      if (isInactive) {
        if (!currentGapStart) currentGapStart = monthKey;
        gapCount++;
      } else {
        if (currentGapStart && gapCount >= 3) {
          gaps.push({
            startMonth: currentGapStart,
            endMonth: this.getPreviousMonthKey(monthKey),
            durationMonths: gapCount,
            note: 'Gap noted — not penalised'
          });
        }
        currentGapStart = null;
        gapCount = 0;
      }
    }

    // End of history gap
    if (currentGapStart && gapCount >= 3) {
      gaps.push({
        startMonth: currentGapStart,
        endMonth: months[months.length - 1],
        durationMonths: gapCount,
        note: 'Gap noted — not penalised'
      });
    }

    return gaps;
  }

  private findPeakWindow(monthlyMap: Map<string, any>): PeakWindow {
    const months = Array.from(monthlyMap.keys()).sort();
    if (months.length === 0) {
        return { startMonth: '', endMonth: '', score: 0 };
    }

    let maxScore = -1;
    let bestWindow = { startMonth: months[0], endMonth: months[0], score: 0 };

    // Sliding window of 24 months
    for (let i = 0; i < months.length; i++) {
      let windowScore = 0;
      const windowEndIndex = Math.min(i + 23, months.length - 1);
      
      for (let j = i; j <= windowEndIndex; j++) {
        const data = monthlyMap.get(months[j]);
        windowScore += data.commits * 1 + data.prs * 3 + data.reviews * 5;
      }

      if (windowScore > maxScore) {
        maxScore = windowScore;
        bestWindow = {
          startMonth: months[i],
          endMonth: months[windowEndIndex],
          score: windowScore
        };
      }
    }

    return bestWindow;
  }

  private calculateTrajectory(monthlyMap: Map<string, any>): Trajectory {
    const months = Array.from(monthlyMap.keys()).sort();
    if (months.length < 1) return 'STABLE';

    const recentMonths = months.slice(-6);
    const priorMonths = months.slice(-12, -6);

    const getScore = (mList: string[]) => {
      return mList.reduce((acc, m) => {
        const d = monthlyMap.get(m);
        return acc + d.commits + d.prs + d.reviews;
      }, 0);
    };

    const recentScore = getScore(recentMonths);
    const priorScore = getScore(priorMonths);

    // ASCENDING: recent > prior * 1.2
    if (recentScore > priorScore * 1.2 && priorScore > 0) return 'ASCENDING';
    
    // DECLINING: recent < prior * 0.8
    if (recentScore < priorScore * 0.8 && priorScore > 0) return 'DECLINING';
    
    // RETURNING: previous < 5 AND recent > 5
    if (priorScore < 5 && recentScore >= 5) return 'RETURNING';

    return 'STABLE';
  }

  private getActivityLevel(data: { commits: number; prs: number; reviews: number }): 'HIGH' | 'MEDIUM' | 'LOW' | 'INACTIVE' {
    const score = data.commits + data.prs * 3 + data.reviews * 5;
    if (score === 0) return 'INACTIVE';
    if (score > 20) return 'HIGH';
    if (score > 5) return 'MEDIUM';
    return 'LOW';
  }

  private toMonthKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  private getPreviousMonthKey(monthKey: string): string {
    const [y, m] = monthKey.split('-').map(Number);
    const date = new Date(y, m - 1, 1);
    date.setMonth(date.getMonth() - 1);
    return this.toMonthKey(date);
  }
}
