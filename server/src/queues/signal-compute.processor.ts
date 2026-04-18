import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GithubRawDataSnapshot } from '../scoring/github-adapter/types';
import { SyncStatus } from '@prisma/client';
import { AnalysisResult } from '../scoring/types/result.types';

@Processor('signal-compute', { concurrency: 10 })
export class SignalComputeProcessor extends WorkerHost {
  private readonly logger = new Logger(SignalComputeProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<{ candidateId: string; githubProfileId: string }>): Promise<AnalysisResult | void> {
    const { githubProfileId } = job.data;
    this.logger.log(`Starting full signal pipeline for profile ${githubProfileId}`);

    const profile = await this.prisma.githubProfile.findUnique({
      where: { id: githubProfileId },
      include: { devCandidate: true },
    });

    if (!profile || !profile.rawDataSnapshot) {
      throw new Error(`GithubProfile ${githubProfileId} not found or has no data snapshot`);
    }

    const rawData = profile.rawDataSnapshot as unknown as GithubRawDataSnapshot;

    try {
      // (a) Set stage: analyzing_projects (60%)
      await this.prisma.githubProfile.update({
        where: { id: githubProfileId },
        data: {
          syncProgress: JSON.stringify({ stage: 'analyzing_projects', percent: 60 }),
        },
      });

      this.logger.log(`Running REFACTORED scoring pipeline (placeholder) for profile ${githubProfileId}`);
      
      // Placeholder for new pipeline - Phase 2-4 implementation will go here
      const result = this.buildPlaceholderResult();

      // (b) Set stage: building_profile (85%)
      await this.prisma.githubProfile.update({
        where: { id: githubProfileId },
        data: {
          syncProgress: JSON.stringify({ stage: 'building_profile', percent: 85 }),
        },
      });

      // (c) Persistence logic for new pipeline will be added in Phase 3
      // For now, we update the status to DONE
      await this.prisma.githubProfile.update({
        where: { id: githubProfileId },
        data: {
          syncStatus: SyncStatus.DONE,
          syncProgress: JSON.stringify({ stage: 'complete', percent: 100 }),
        },
      });

      return result;

    } catch (error) {
      this.logger.error(`Pipeline failed for profile ${githubProfileId}: ${error.stack}`);
      throw error;
    }
  }

  private buildPlaceholderResult(): AnalysisResult {
    return {
      summary: 'Placeholder summary for the refactored scoring engine.',
      capabilities: {
        backend: { score: 0, confidence: 'low' },
        frontend: { score: 0, confidence: 'low' },
        devops: { score: 0, confidence: 'low' },
      },
      ownership: {
        ownedProjects: 0,
        activelyMaintained: 0,
        confidence: 'low',
      },
      impact: {
        activityLevel: 'low',
        consistency: 'sparse',
        externalContributions: 0,
        confidence: 'low',
      },
    };
  }
}
