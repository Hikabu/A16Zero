import {
  ConfidenceLevel,
  ActivityLevel,
  ConsistencyLevel,
} from '../scoring/types/result.types';

export interface ScorecardResult {
  snapshot: {
    seniority: string;
    summary: string;
    riskLevel: string;
    generatedAt: Date;
  };
  timeline: {
    phases: any[];
    trajectory: string;
    generatedAt: Date;
  };
  signals: any;
  claims: any[];
  confidenceEnvelope: {
    overallConfidence: number;
    confidenceTier: string;
    riskLevel: string;
    caveats: any[];
    scoreWithheld: boolean;
  };
  percentile: {
    ecosystemPercentile: number;
    ecosystemPercentileLabel: string;
    crossEcosystemPercentile: number;
    cohortSize: number;
  };
  behaviorClassification: {
    primaryPattern: string;
    primaryConfidence: number;
    secondaryPattern: string | null;
  };
}

export interface PreviewRequestDto {
  githubUsername: string;
}
