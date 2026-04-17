import { GithubRawDataSnapshot } from '../github-adapter/types';
import { FirewallResult } from '../firewall/types';

export type PillarKey = 'ACTIVITY' | 'COLLABORATION' | 'QUALITY' | 'RELIABILITY' | 'IMPACT' | 'GROWTH';

export type SignalKey = 
  | 'activeWeeksRatio'
  | 'commitConsistencyScore'
  | 'prThroughput90d'
  | 'reviewDepth'
  | 'prReviewCount12m'
  | 'externalPrRatio'
  | 'prAcceptanceRate'
  | 'changeRequestFrequency'
  | 'reworkRatio'
  | 'testFilePresence'
  | 'cicdConfigDetection'
  | 'starsOnOriginalRepos'
  | 'highPrestigeRepoContributions'
  | 'newLanguagesAdopted1yr'
  | 'seniorityTrajectory'
  | 'privateOrgActivity'
  // Web3-aware GitHub signals
  | 'coreProtocolPrMerges'
  | 'securityKeywordReviewDepth'
  | 'prestigeForkToPrRatio'
  | 'languageEvolutionTrajectory';

export interface SignalValue {
  value: number | boolean | null;
  confidence: number;
  excluded: boolean;
  exclusionReason?: string;
  sampleSize?: number;
  minimumRequired?: number;
}

export interface ExcludedSignal {
  key: SignalKey;
  reason: string;
  sampleSize: number;
  minimumRequired: number;
}

export interface SignalComputeResult {
  signals: Record<SignalKey, SignalValue>;
  excludedSignals: ExcludedSignal[];
  consistencyNotes: string[];
  pillarSignals: Record<PillarKey, SignalKey[]>;
  fraudScore: number;
  fraudTier: string;
}
