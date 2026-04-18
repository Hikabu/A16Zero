import { 
  CandidateSignals, 
  DeveloperSnapshot, 
  CareerTimeline, 
  CandidateClaim,
  RoleType,
} from '@prisma/client';
import { ConfidenceEnvelope } from '../scoring/confidence-envelope/types';
import { PercentileResult } from '../scoring/percentile-calculator/percentile-calculator.service';
import { BehaviorClassificationResult } from '../scoring/behavior-classifier/types';

export interface ScorecardResult {
  snapshot: DeveloperSnapshot;
  timeline: CareerTimeline;
  signals: CandidateSignals;
  claims: CandidateClaim[];
  confidenceEnvelope: ConfidenceEnvelope;
  percentile: PercentileResult;
  behaviorClassification: BehaviorClassificationResult;
}

export interface PreviewRequestDto {
  githubUsername: string;
  roleType: RoleType;
}
