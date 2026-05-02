import { Injectable } from '@nestjs/common';
import { AnalysisResult } from '../types/result.types';
import { ParsedJobRequirements } from './parsed-job-requirements.inteface';
import { Seniority } from '@prisma/client';

export interface Gap {
  dimension: string;
  severity: 'DEALBREAKER' | 'SIGNIFICANT' | 'MINOR';
  actual: string;
  expected: string;
  mitigatingContext: string | null;
  probeQuestion: string | null; // populated for SIGNIFICANT and DEALBREAKER only
}

export interface GapReport {
  overallVerdict: 'LIKELY_FIT' | 'POSSIBLE_FIT' | 'UNLIKELY_FIT';
  gaps: Gap[];
  technologyFitScore: number;
  missingTechnologies: string[];
  matchedTechnologies: string[];
}

@Injectable()
export class GapAnalysisService {
  compute(analysisResult: AnalysisResult, job: any): GapReport {
    const parsedReqs: ParsedJobRequirements = job.parsedRequirements as any;
    const gaps: Gap[] = [];

    // Step 1 — Technology matching
    const requiredTechs = parsedReqs?.requiredTechnologies || [];
    const candidateTechs = [
      ...analysisResult.stack.languages,
      ...analysisResult.stack.tools,
    ].map((t) => t.toLowerCase());

    const matchedTechnologies: string[] = [];
    const missingTechnologies: string[] = [];

    requiredTechs.forEach((req) => {
      if (candidateTechs.includes(req.toLowerCase())) {
        matchedTechnologies.push(req);
      } else {
        missingTechnologies.push(req);
        gaps.push({
          dimension: `Technology: ${req}`,
          severity: 'DEALBREAKER',
          actual: 'Not detected in open source history',
          expected: 'Required',
          mitigatingContext: null,
          probeQuestion: null,
        });
      }
    });

    const technologyFitScore = requiredTechs.length > 0
      ? Math.min(100, Math.round((matchedTechnologies.length / requiredTechs.length) * 100))
      : 100;

    // Step 2 — Capability threshold gaps
    const seniority = parsedReqs?.requiredSeniority || Seniority.MID;
    const thresholds: Record<Seniority, number> = {
      [Seniority.JUNIOR]: 30,
      [Seniority.MID]: 50,
      [Seniority.SENIOR]: 70,
      [Seniority.LEAD]: 75,
    };
    const threshold = thresholds[seniority];

    const dimensions: (keyof typeof analysisResult.capabilities)[] = ['backend', 'frontend', 'devops'];

    dimensions.forEach((dim) => {
      const score = analysisResult.capabilities[dim].score * 100;
      const delta = threshold - score;

      if (delta > 0) {
        let severity: Gap['severity'] = 'MINOR';
        if (delta > 20) severity = 'DEALBREAKER';
        else if (delta > 10) severity = 'SIGNIFICANT';

        const mitigatingContext = (analysisResult as any).privateWorkIndicator || analysisResult.privateWorkNote
          ? 'Private work indicator detected.'
          : null;

        let probeQuestion: string | null = null;
        if (severity === 'DEALBREAKER' || severity === 'SIGNIFICANT') {
          probeQuestion = `Walk me through the most complex ${dim} system you have built. What were the key design decisions?`;
        }

        gaps.push({
          dimension: dim.toUpperCase(),
          severity,
          actual: `${score}/100`,
          expected: `${threshold}/100`,
          mitigatingContext,
          probeQuestion,
        });
      }
    });

    // Step 3 — overallVerdict
    let overallVerdict: GapReport['overallVerdict'] = 'LIKELY_FIT';
    const hasDealbreaker = gaps.some((g) => g.severity === 'DEALBREAKER');
    const hasSignificant = gaps.some((g) => g.severity === 'SIGNIFICANT');

    if (hasDealbreaker) {
      overallVerdict = 'UNLIKELY_FIT';
    } else if (hasSignificant) {
      overallVerdict = 'POSSIBLE_FIT';
    }

    // Step 4 — return GapReport
    return {
      overallVerdict,
      gaps,
      technologyFitScore,
      missingTechnologies,
      matchedTechnologies,
    };
  }
}
