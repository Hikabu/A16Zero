import { z } from 'zod';
import { RoleType, Seniority, RiskLevel } from '@prisma/client';

/**
 * Frontend-Safe UI Model
 */
export const ScorecardUiSchema = z.object({
  profile: z.object({
    username: z.string().describe('GitHub username of the candidate'),
    avatarUrl: z.string().url().optional().describe('URL to the candidate profile avatar'),
    primaryCohort: z.string().describe('The primary ecosystem cohort (e.g., typescript-node)'),
    seniority: z.nativeEnum(Seniority).describe('Inferred developer seniority level'),
    summary: z.string().describe('A concise professional summary of the developer'),
  }),
  score: z.object({
    value: z.coerce.number().min(0).max(100).describe('Normalized capability score'),
    percentile: z.coerce.number().min(0).max(100).describe('Percentile rank within the cohort'),
    isWithheld: z.object({
      value: z.boolean().describe('Whether the score is withheld'),
      reason: z.string().optional().describe('Human-readable reason for withholding the score (e.g., insufficient data)'),
    }).describe('Score withholding status and context'),
  }),
  trust: z.object({
    level: z.string().describe('Confidence tier (FULL, PARTIAL, LOW, MINIMAL)'),
    risk: z.nativeEnum(RiskLevel).describe('Systemic risk assessment'),
    label: z.string().describe('HR-friendly status label'),
    guidance: z.string().describe('Actionable guidance for the recruiter'),
  }).describe('Reliability and risk assessment for the scorecard'),
  insights: z.object({
    capabilities: z.array(z.string()).describe('Strong professional capabilities identified'),
    gaps: z.array(z.string()).describe('Identified skill gaps or missing evidence'),
    caveats: z.array(z.string()).describe('Data quality or integrity caveats'),
  }),
});

/**
 * Full Response Schema (including Raw data)
 */
export const ScorecardResponseSchema = z.object({
  ui: ScorecardUiSchema.describe('Transformed model for immediate UI rendering'),
  raw: z.any().describe('Full internal scoring result for audit and secondary logic'),
});

/**
 * Preview Request Schema
 */
export const ScorecardPreviewRequestSchema = z.object({
  githubUsername: z.string().min(1).describe('The GitHub username to analyze'),
});
