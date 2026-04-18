export type ConfidenceLevel = 'low' | 'medium' | 'high';
export type ActivityLevel = 'high' | 'medium' | 'low';
export type ConsistencyLevel = 'strong' | 'moderate' | 'sparse';
export type ProgressStage = 'queued' | 'fetching_repos' | 'analyzing_projects' | 'building_profile' | 'complete';

export interface AnalysisResult {
  summary: string;
  capabilities: {
    backend:  { score: number; confidence: ConfidenceLevel };
    frontend: { score: number; confidence: ConfidenceLevel };
    devops:   { score: number; confidence: ConfidenceLevel };
  };
  ownership: {
    ownedProjects:        number;
    activelyMaintained:   number;
    confidence:           ConfidenceLevel;
  };
  impact: {
    activityLevel:         ActivityLevel;
    consistency:           ConsistencyLevel;
    externalContributions: number;
    confidence:            ConfidenceLevel;
  };
}

export interface ExtractedSignals {
  ownershipDepth: number;
  projectLongevity: number;
  activityConsistency: number;
  techStackBreadth: number;
  externalContributions: number;
  projectMeaningfulness: number;
  stackIdentity: string[];
  dataCompleteness: number;
}
