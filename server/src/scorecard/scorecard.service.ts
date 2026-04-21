import { Injectable, Logger } from '@nestjs/common';
import { ScorecardUiDto } from './contract/scorecard.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ScorecardResult } from './scorecard.types';
import { GithubAdapterService } from '../scoring/github-adapter/github-adapter.service';
import { ConfigService } from '@nestjs/config';
import { AnalysisResult } from 'src/scoring/types/result.types';
import { CacheService } from 'src/scoring/cache/cache.service';
import { RawScorecard } from './contract/scorecard.schema';

@Injectable()
export class ScorecardService {
  private readonly logger = new Logger(ScorecardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly githubAdapter: GithubAdapterService,
    private readonly cacheService: CacheService,
  ) {}

  async computeForCandidate(candidateId: string): Promise<ScorecardResult> {
    this.logger.log(`Computing scorecard for candidate ${candidateId} (Refactored Placeholder)`);
    
    // For now, return a placeholder result until Phase 3 implementation
    return this.buildPlaceholderResult();
  }

  async previewForUsername(githubUsername: string): Promise<ScorecardResult> {
    this.logger.log(`Running headless preview for ${githubUsername} (Refactored Placeholder)`);
    console.log("headless previewForUsername: ", githubUsername);
    const githubToken = this.configService.get<string>('GITHUB_SYSTEM_TOKEN');
    if (!githubToken) {
      throw new Error('GITHUB_SYSTEM_TOKEN not configured');

    }
    console.log("github token: ", githubToken);

    // Still fetch raw data to verify connectivity, but return placeholder result
    const realData = await this.githubAdapter.fetchRawData(githubUsername, githubToken);
    console.log("fetched raw data for: ", githubUsername);
    console.log("raw data: ", realData);

    return this.buildPlaceholderResult();
  }

  async getScorecardForUser(userId: string) : Promise<RawScorecard | null> {
    // Walk: User → Candidate → scorecard
    const candidate = await this.prisma.candidate.findFirst({
      where: { userId },
      select: {
        scorecard: true,
        devProfile: {
          select: {
            githubProfile: {
              select: {
                githubUsername: true,
                lastSyncAt: true,
                syncStatus: true,
              },
            },
          },
        },
      },
    });

    if (!candidate) return null;

    // DB has it — return with sync metadata attached
    if (candidate.scorecard) {
      return candidate.scorecard as RawScorecard;
    }

    // DB empty but maybe Redis has a fresher result (sync just finished)
    const username = candidate.devProfile?.githubProfile?.githubUsername;
    if (username) {
      this.logger.warn(`DB scorecard empty for user ${userId}, checking Redis`);
      return this.getScorecardFromCache(username);
    }

    return null;
  }


  async getScorecardFromCache(githubUsername: string): Promise<AnalysisResult | null> {
    const cacheKey = this.cacheService.buildCacheKey(githubUsername);
    const cached = await this.cacheService.get(cacheKey);

    if (cached) {
      return cached;
    }

    return null;
  }
mapToUiModel(raw: RawScorecard): ScorecardUiDto {
  const capabilities = [
    this.mapCapability('backend', raw.capabilities.backend),
    this.mapCapability('frontend', raw.capabilities.frontend),
    this.mapCapability('devops', raw.capabilities.devops),
  ];

  return {
    profile: {
      username: 'unknown', // not in raw
      avatarUrl: undefined,
      primaryCohort: 'unknown',
      seniority: 'MID' as any,
      summary: raw.summary,
    },

    score: {
      value: this.computeOverallScore(raw.capabilities),
      percentile: 0,
      isWithheld: {
        value: false,
      },
    },

    trust: {
      level: this.mapConfidenceLevel(raw),
      risk: 'LOW_RISK' as any,
      label: this.mapTrustLabel(raw),
      guidance: this.mapGuidance(raw),
    },

    insights: {
      capabilities,
      highlights: this.buildHighlights(raw),
      gaps: this.buildGaps(raw),
      caveats: [],

      ownership: raw.ownership,
      impact: raw.impact,
    },
  };
}
private buildGaps(raw: RawScorecard): string[] {
  const out: string[] = [];

  if (raw.capabilities.frontend.score < 0.5) {
    out.push('Limited frontend evidence');
  }

  if (raw.capabilities.devops.score < 0.5) {
    out.push('Limited DevOps exposure');
  }

  if (raw.impact.externalContributions === 0) {
    out.push('No external contributions detected');
  }

  return out;
}
private buildHighlights(raw: RawScorecard): string[] {
  const out: string[] = [];

  if (raw.capabilities.backend.score >= 0.7) {
    out.push('Strong backend capability');
  }

  if (raw.ownership.activelyMaintained > 5) {
    out.push(`Maintains ${raw.ownership.activelyMaintained} active projects`);
  }

  if (raw.impact.externalContributions > 0) {
    out.push('Has external/open-source contributions');
  }

  return out;
}
private mapGuidance(raw: RawScorecard): string {
  if (raw.impact.externalContributions === 0) {
    return 'Limited external contributions—consider reviewing project depth.';
  }

  return 'Sufficient activity and project ownership observed.';
}
private mapTrustLabel(raw: RawScorecard): string {
  if (raw.impact.confidence === 'high') return 'HIGH CONFIDENCE';
  if (raw.impact.confidence === 'medium') return 'MODERATE CONFIDENCE';
  return 'LOW CONFIDENCE';
}
private mapConfidenceLevel(raw: RawScorecard): string {
  const confidences = [
    raw.capabilities.backend.confidence,
    raw.capabilities.frontend.confidence,
    raw.capabilities.devops.confidence,
    raw.ownership.confidence,
    raw.impact.confidence,
  ];

  if (confidences.every(c => c === 'high')) return 'FULL';
  if (confidences.includes('medium')) return 'PARTIAL';
  return 'LOW';
}

private mapCapability(
  key: 'backend' | 'frontend' | 'devops',
  data: { score: number; confidence: string }
) {
  return {
    key,
    label: this.labelize(key),
    score: data.score,
    displayScore: Math.round(data.score * 100),
    confidence: data.confidence,
    strength: this.mapStrength(data.score),
  };
}
private mapStrength(score: number): 'strong' | 'moderate' | 'weak' {
  if (score >= 0.7) return 'strong';
  if (score >= 0.4) return 'moderate';
  return 'weak';
}
private labelize(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1);
}
private computeOverallScore(capabilities: RawScorecard['capabilities']): number {
  const scores = [
    capabilities.backend.score,
    capabilities.frontend.score,
    capabilities.devops.score,
  ];

  return Math.round(
    (scores.reduce((a, b) => a + b, 0) / scores.length) * 100
  );
}
  private buildPlaceholderResult(): ScorecardResult {
    return {
      snapshot: {
        seniority: 'MID' as any,
        summary: 'Placeholder summary.',
        riskLevel: 'LOW_RISK' as any,
        generatedAt: new Date(),
      } as any,
      timeline: {
        phases: [],
        trajectory: 'STABLE',
        generatedAt: new Date(),
      } as any,
      signals: {} as any,
      claims: [],
      confidenceEnvelope: {
        overallConfidence: 0,
        confidenceTier: 'LOW' as any,
        riskLevel: 'LOW_RISK' as any,
        caveats: [],
        scoreWithheld: false,
      },
      percentile: {
        ecosystemPercentile: 0,
        ecosystemPercentileLabel: '',
        crossEcosystemPercentile: 0,
        cohortSize: 0,
      },
      behaviorClassification: {
        primaryPattern: 'BALANCED_CONTRIBUTOR' as any,
        primaryConfidence: 0,
        secondaryPattern: null,
      } as any,
    };
  }
}
