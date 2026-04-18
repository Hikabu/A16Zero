import { Injectable, Logger } from '@nestjs/common';
import { ScorecardUiDto } from './contract/scorecard.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ScorecardResult } from './scorecard.types';
import { GithubAdapterService } from '../scoring/github-adapter/github-adapter.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ScorecardService {
  private readonly logger = new Logger(ScorecardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly githubAdapter: GithubAdapterService,
  ) {}

  async computeForCandidate(candidateId: string): Promise<ScorecardResult> {
    this.logger.log(`Computing scorecard for candidate ${candidateId} (Refactored Placeholder)`);
    
    // For now, return a placeholder result until Phase 3 implementation
    return this.buildPlaceholderResult();
  }

  async previewForUsername(githubUsername: string): Promise<ScorecardResult> {
    this.logger.log(`Running headless preview for ${githubUsername} (Refactored Placeholder)`);
    
    const githubToken = this.configService.get<string>('GITHUB_SYSTEM_TOKEN');
    if (!githubToken) {
      throw new Error('GITHUB_SYSTEM_TOKEN not configured');
    }

    // Still fetch raw data to verify connectivity, but return placeholder result
    await this.githubAdapter.fetchRawData(githubUsername, githubToken);

    return this.buildPlaceholderResult();
  }

  mapToUiModel(result: ScorecardResult): ScorecardUiDto {
    return {
      profile: {
        username: 'candidate',
        avatarUrl: undefined,
        primaryCohort: 'unknown',
        seniority: 'MID' as any,
        summary: 'Reviewing developer history...',
      },
      score: {
        value: 0,
        percentile: 0,
        isWithheld: {
          value: false,
        },
      },
      trust: {
        level: 'PARTIAL' as any,
        risk: 'LOW_RISK' as any,
        label: 'NEUTRAL',
        guidance: 'Awaiting updated scoring analysis.',
      },
      insights: {
        capabilities: [],
        gaps: [],
        caveats: [],
      },
    };
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
