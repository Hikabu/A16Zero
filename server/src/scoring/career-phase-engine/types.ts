export interface CareerPhase {
  startMonth: string; // YYYY-MM
  endMonth: string;   // YYYY-MM
  activityLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'INACTIVE';
  commitCount: number;
  prCount: number;
}

export interface CareerGap {
  startMonth: string; // YYYY-MM
  endMonth: string;   // YYYY-MM
  durationMonths: number;
  note: string;
}

export interface PeakWindow {
  startMonth: string; // YYYY-MM
  endMonth: string;   // YYYY-MM
  score: number;
}

export type Trajectory = 'ASCENDING' | 'STABLE' | 'DECLINING' | 'RETURNING';

export interface CareerPhaseResult {
  phases: CareerPhase[];
  gapEvents: CareerGap[];
  careerGapDetected: boolean;
  longestGapMonths: number;
  careerGapNote: string | null;
  peakWindow: PeakWindow;
  trajectory: Trajectory;
}
