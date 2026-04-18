import { SignalKey } from '../signal-engine/types';

export interface Baseline {
  median: number;
  stdDev: number;
}

export type CohortBaselines = Record<string, Record<SignalKey, Baseline>>;

/**
 * Synthetic baselines for launch cohorts.
 * These represent z-score normalization points (value - median) / stdDev.
 * Medians are based on typical distributions for each technology ecosystem.
 */
export const COHORT_BASELINES: CohortBaselines = {
  'typescript-node': {
    activeWeeksRatio: { median: 0.6, stdDev: 0.2 },
    commitConsistencyScore: { median: 0.7, stdDev: 0.15 },
    prThroughput90d: { median: 0.5, stdDev: 0.3 },
    reviewDepth: { median: 0.4, stdDev: 0.2 },
    prReviewCount12m: { median: 20, stdDev: 15 },
    externalPrRatio: { median: 0.3, stdDev: 0.2 },
    prAcceptanceRate: { median: 0.85, stdDev: 0.1 },
    changeRequestFrequency: { median: 0.2, stdDev: 0.15 },
    reworkRatio: { median: 0.15, stdDev: 0.1 },
    testFilePresence: { median: 0.8, stdDev: 0.2 },
    cicdConfigDetection: { median: 0.7, stdDev: 0.3 },
    starsOnOriginalRepos: { median: 0.1, stdDev: 0.2 },
    highPrestigeRepoContributions: { median: 0, stdDev: 1 },
    newLanguagesAdopted1yr: { median: 1, stdDev: 1 },
    seniorityTrajectory: { median: 0.5, stdDev: 0.2 },
    privateOrgActivity: { median: 0.5, stdDev: 0.5 },
    coreProtocolPrMerges: { median: 0, stdDev: 1 },
    securityKeywordReviewDepth: { median: 0.05, stdDev: 0.1 },
    prestigeForkToPrRatio: { median: 0.1, stdDev: 0.2 },
    languageEvolutionTrajectory: { median: 0.5, stdDev: 0.3 },
    activeMonths: { median: 12, stdDev: 10 },
    avgWeeklyCommits: { median: 3, stdDev: 5 }
  },
  'rust-systems': {
    activeWeeksRatio: { median: 0.5, stdDev: 0.2 },
    commitConsistencyScore: { median: 0.8, stdDev: 0.1 },
    prThroughput90d: { median: 0.3, stdDev: 0.2 },
    reviewDepth: { median: 0.6, stdDev: 0.2 }, // Rust reviews tend to be deeper
    prReviewCount12m: { median: 15, stdDev: 10 },
    externalPrRatio: { median: 0.4, stdDev: 0.2 },
    prAcceptanceRate: { median: 0.75, stdDev: 0.15 }, // Tougher acceptance
    changeRequestFrequency: { median: 0.35, stdDev: 0.2 },
    reworkRatio: { median: 0.25, stdDev: 0.15 },
    testFilePresence: { median: 0.9, stdDev: 0.1 },
    cicdConfigDetection: { median: 0.8, stdDev: 0.2 },
    starsOnOriginalRepos: { median: 0.2, stdDev: 0.3 },
    highPrestigeRepoContributions: { median: 0.1, stdDev: 0.5 },
    newLanguagesAdopted1yr: { median: 0.5, stdDev: 0.8 },
    seniorityTrajectory: { median: 0.6, stdDev: 0.2 },
    privateOrgActivity: { median: 0.4, stdDev: 0.5 },
    coreProtocolPrMerges: { median: 0.05, stdDev: 0.3 },
    securityKeywordReviewDepth: { median: 0.15, stdDev: 0.2 },
    prestigeForkToPrRatio: { median: 0.2, stdDev: 0.3 },
    languageEvolutionTrajectory: { median: 0.7, stdDev: 0.2 },
    activeMonths: { median: 18, stdDev: 12 },
    avgWeeklyCommits: { median: 2, stdDev: 3 }
  },
  'python-ml': {
    activeWeeksRatio: { median: 0.45, stdDev: 0.25 },
    commitConsistencyScore: { median: 0.6, stdDev: 0.2 },
    prThroughput90d: { median: 0.4, stdDev: 0.3 },
    reviewDepth: { median: 0.3, stdDev: 0.2 },
    prReviewCount12m: { median: 10, stdDev: 12 },
    externalPrRatio: { median: 0.2, stdDev: 0.2 },
    prAcceptanceRate: { median: 0.8, stdDev: 0.15 },
    changeRequestFrequency: { median: 0.15, stdDev: 0.1 },
    reworkRatio: { median: 0.1, stdDev: 0.1 },
    testFilePresence: { median: 0.6, stdDev: 0.3 },
    cicdConfigDetection: { median: 0.5, stdDev: 0.3 },
    starsOnOriginalRepos: { median: 0.3, stdDev: 0.4 },
    highPrestigeRepoContributions: { median: 0.2, stdDev: 0.6 },
    newLanguagesAdopted1yr: { median: 0.8, stdDev: 0.9 },
    seniorityTrajectory: { median: 0.5, stdDev: 0.2 },
    privateOrgActivity: { median: 0.3, stdDev: 0.4 },
    coreProtocolPrMerges: { median: 0.02, stdDev: 0.1 },
    securityKeywordReviewDepth: { median: 0.02, stdDev: 0.05 },
    prestigeForkToPrRatio: { median: 0.05, stdDev: 0.15 },
    languageEvolutionTrajectory: { median: 0.4, stdDev: 0.3 },
    activeMonths: { median: 24, stdDev: 18 },
    avgWeeklyCommits: { median: 4, stdDev: 8 }
  },
  'solidity-web3': {
    activeWeeksRatio: { median: 0.7, stdDev: 0.15 }, // Web3 moves fast
    commitConsistencyScore: { median: 0.75, stdDev: 0.15 },
    prThroughput90d: { median: 0.6, stdDev: 0.4 },
    reviewDepth: { median: 0.5, stdDev: 0.3 },
    prReviewCount12m: { median: 25, stdDev: 20 },
    externalPrRatio: { median: 0.5, stdDev: 0.3 },
    prAcceptanceRate: { median: 0.7, stdDev: 0.2 }, // High complexity
    changeRequestFrequency: { median: 0.4, stdDev: 0.25 },
    reworkRatio: { median: 0.3, stdDev: 0.2 },
    testFilePresence: { median: 0.95, stdDev: 0.05 }, // Crucial in Web3
    cicdConfigDetection: { median: 0.9, stdDev: 0.1 },
    starsOnOriginalRepos: { median: 0.1, stdDev: 0.3 },
    highPrestigeRepoContributions: { median: 0.5, stdDev: 1.0 },
    newLanguagesAdopted1yr: { median: 1.2, stdDev: 1.0 },
    seniorityTrajectory: { median: 0.7, stdDev: 0.2 },
    privateOrgActivity: { median: 0.8, stdDev: 0.3 },
    coreProtocolPrMerges: { median: 0.3, stdDev: 0.8 },
    securityKeywordReviewDepth: { median: 0.4, stdDev: 0.3 },
    prestigeForkToPrRatio: { median: 0.4, stdDev: 0.4 },
    languageEvolutionTrajectory: { median: 0.9, stdDev: 0.1 },
    activeMonths: { median: 14, stdDev: 8 },
    avgWeeklyCommits: { median: 5, stdDev: 6 }
  }
  // Others omitted for brevity in MVP but would follow similar patterns
};

// Default baseline for unknown signals or uncategorised
export const DEFAULT_BASELINE: Record<SignalKey, Baseline> = COHORT_BASELINES['typescript-node'];
