import { PillarKey } from '../signal-engine/types';

export type VisibilityTier = 'FULL' | 'PARTIAL' | 'LOW' | 'MINIMAL';

export interface DataCompletenessResult {
  dataCoveragePercent: number;       // 0–100
  visibilityTier: VisibilityTier;    // FULL | PARTIAL | LOW | MINIMAL
  rebalancedWeights: Record<PillarKey, number>;  // always sums to 1.0
  scoreWithheld: boolean;
  completenessNote: string | null;
  pillarEvaluability: Record<PillarKey, boolean>;
  overallConfidenceCap: number | null; // null = no cap; 0.45 for MINIMAL
}
