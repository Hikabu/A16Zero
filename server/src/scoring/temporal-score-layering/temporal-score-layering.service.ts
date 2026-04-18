import { Injectable } from '@nestjs/common';
import { SignalComputeResult } from '../signal-engine/types';
import { CareerPhaseResult } from '../career-phase-engine/types';
import { GithubRawDataSnapshot } from '../github-adapter/types';
import { TemporalWeightConfig, TemporalScoreResult } from './types';

@Injectable()
export class TemporalScoreLayeringService {
  compute(
    signalResult: SignalComputeResult,
    careerPhase: CareerPhaseResult,
    config: TemporalWeightConfig,
    rawData: GithubRawDataSnapshot
  ): TemporalScoreResult {
    const peakWindow = careerPhase.peakWindow;
    const peakStart = this.parseMonthKey(peakWindow.startMonth);
    const peakEnd = this.getEndOfMonth(this.parseMonthKey(peakWindow.endMonth));

    const peakScore = this.calculateActivityScoreForWindow(rawData, peakStart, peakEnd);

    // Recent Activity Score (last 6 months)
    const recentEnd = new Date(rawData.fetchedAt);
    const recentStart = new Date(recentEnd);
    recentStart.setMonth(recentStart.getMonth() - 6);
    
    const recentScore = this.calculateActivityScoreForWindow(rawData, recentStart, recentEnd);

    // Composite Score
    let { historicalWeight, recentWeight } = config;
    let isTrajectoryOverridden = false;

    // RETURNING trajectory detected: historicalWeight auto-overridden to 0.80
    if (careerPhase.trajectory === 'RETURNING') {
      historicalWeight = 0.80;
      recentWeight = 0.20;
      isTrajectoryOverridden = true;
    }

    const compositeScore = (peakScore * historicalWeight) + (recentScore * recentWeight);

    return {
      peakCareerScore: Number(peakScore.toFixed(2)),
      recentActivityScore: Number(recentScore.toFixed(2)),
      compositeScore: Number(compositeScore.toFixed(2)),
      appliedWeights: { historicalWeight, recentWeight },
      isTrajectoryOverridden
    };
  }

  private calculateActivityScoreForWindow(
    data: GithubRawDataSnapshot,
    start: Date,
    end: Date
  ): number {
    const totalWeeks = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24 * 7)));
    
    // 1. activeWeeksRatio
    const weeklyCommits = this.getWeeklyCommits(data, start, end);
    const activeWeeks = Object.values(weeklyCommits).filter(v => v > 0).length;
    const activeRatio = Math.min(1, activeWeeks / totalWeeks);

    // 2. commitConsistencyScore
    const counts = Object.values(weeklyCommits);
    const consistency = this.calculateConsistency(counts);

    // 3. prThroughput (scaled)
    const prCount = data.graphql.pullRequests.filter(pr => {
      const d = new Date(pr.createdAt);
      return d >= start && d <= end && !pr.excludeFromSignals;
    }).length;
    const prThroughput = Math.min(1, prCount / totalWeeks); // 1 PR/week is 1.0

    // Average them, scaled to [0,1]
    return (activeRatio + consistency + prThroughput) / 3;
  }

  private getWeeklyCommits(data: GithubRawDataSnapshot, start: Date, end: Date): Record<string, number> {
    const weekly: Record<string, number> = {};
    
    Object.values(data.rest.commits).forEach((repoCommits: any[]) => {
      repoCommits.forEach(c => {
        if (c.excludeFromSignals) return;
        const d = new Date(c.commit.author.date);
        if (d >= start && d <= end) {
          const weekStr = this.getWeekString(d);
          weekly[weekStr] = (weekly[weekStr] || 0) + 1;
        }
      });
    });

    return weekly;
  }

  private calculateConsistency(counts: number[]): number {
    if (counts.length < 2) return 0;
    const median = this.calculateMedian(counts);
    const stdDev = this.calculateStdDev(counts);
    return Math.max(0, Math.min(1, 1 - (stdDev / (median + 0.001))));
  }

  private calculateMedian(vals: number[]): number {
    if (vals.length === 0) return 0;
    const sorted = [...vals].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  private calculateStdDev(vals: number[]): number {
    if (vals.length === 0) return 0;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const squareDiffs = vals.map(v => Math.pow(v - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / vals.length;
    return Math.sqrt(avgSquareDiff);
  }

  private getWeekString(date: Date): string {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay()); // Sunday
    return d.toISOString().split('T')[0];
  }

  private parseMonthKey(key: string): Date {
    const [y, m] = key.split('-').map(Number);
    return new Date(y, m - 1, 1);
  }

  private getEndOfMonth(date: Date): Date {
    const d = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    d.setHours(23, 59, 59, 999);
    return d;
  }
}
