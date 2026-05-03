import { PipelineStage } from '@prisma/client';

export const INTERVIEW_STAGES = new Set<PipelineStage>([
  PipelineStage.INTERVIEW_HR,
  PipelineStage.INTERVIEW_TECHNICAL,
  PipelineStage.INTERVIEW_FINAL,
]);