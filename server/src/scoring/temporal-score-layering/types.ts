export interface TemporalWeightConfig {
  historicalWeight: number; // e.g. 0.6
  recentWeight: number;     // e.g. 0.4
}

export interface TemporalScoreResult {
  peakCareerScore: number;       // 0–1
  recentActivityScore: number;   // 0–1
  compositeScore: number;        // 0–1
  appliedWeights: TemporalWeightConfig;
  isTrajectoryOverridden: boolean;
}
