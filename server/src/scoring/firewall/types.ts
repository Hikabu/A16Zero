import { GithubRawDataSnapshot } from '../github-adapter/types';

export enum FraudTier {
  CLEAN = 'CLEAN',
  SUSPICIOUS = 'SUSPICIOUS',
  LIKELY_FRAUDULENT = 'LIKELY_FRAUDULENT',
}

export interface RemovedRepo {
  repoId: string;
  repoName: string;
  reason: string;
}

export interface FlaggedRepo {
  repoId: string;
  repoName: string;
  flag: string;
  fraudScoreIncrement: number;
  weight?: number;
}

export interface FirewallLogEntry {
  filter: string;
  action: 'REMOVED' | 'DE_WEIGHTED' | 'FLAGGED' | 'LABELLED';
  repoId: string;
  reason: string;
}

export interface FirewallResult {
  cleanedData: GithubRawDataSnapshot;
  removedRepos: RemovedRepo[];
  flaggedRepos: FlaggedRepo[];
  fraudScore: number;
  fraudTier: FraudTier;
  firewallLog: FirewallLogEntry[];
}

export type GithubRawData = GithubRawDataSnapshot;
