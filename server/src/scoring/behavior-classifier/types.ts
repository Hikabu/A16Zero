export enum BehaviorPattern {
  REVIEW_HEAVY_SENIOR = 'REVIEW_HEAVY_SENIOR',
  COMMIT_HEAVY_MIDLEVEL = 'COMMIT_HEAVY_MIDLEVEL',
  BALANCED_CONTRIBUTOR = 'BALANCED_CONTRIBUTOR',
  OSS_COLLABORATOR = 'OSS_COLLABORATOR',
  EARLY_CAREER = 'EARLY_CAREER',
  RETURNING_DEVELOPER = 'RETURNING_DEVELOPER',
  WEB3_SPECIALIST = 'WEB3_SPECIALIST',
}

export interface BehaviorClassificationResult {
  primaryPattern: BehaviorPattern;
  primaryConfidence: number;
  secondaryPattern: BehaviorPattern | null;
  hrLabel: string;
  hrDescription: string;
  accuracyDisclosure: string | null;
}
