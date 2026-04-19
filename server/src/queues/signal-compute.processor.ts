import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GithubRawDataSnapshot } from '../scoring/github-adapter/types';
import { SyncStatus } from '@prisma/client';
import { AnalysisResult } from '../scoring/types/result.types';
import { ScoringService } from '../scoring/scoring-service/scoring.service';
import { SignalExtractorService } from '../scoring/signal-extractor/signal-extractor.service';
import { GithubAdapterService } from '../scoring/github-adapter/github-adapter.service';
import { CacheService } from '../scoring/cache/cache.service';
import { OnWorkerEvent } from '@nestjs/bullmq';

@Processor('signal-compute', { concurrency: 10 })
export class SignalComputeProcessor extends WorkerHost {
  private readonly logger = new Logger(SignalComputeProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scoringService: ScoringService,
    private readonly signalExtractor: SignalExtractorService,
    private readonly githubAdapter: GithubAdapterService,
    private readonly cacheService: CacheService,
  ) {
    super();
  }
  @OnWorkerEvent('active')
onActive(job: Job) {
  console.log('🟡 ACTIVE:', job.id);
}

@OnWorkerEvent('completed')
onCompleted(job: Job) {
  console.log('✅ COMPLETED:', job.id);
}

@OnWorkerEvent('failed')
onFailed(job: Job, err: Error) {
  console.log('🔴 FAILED:', job.id, err.message);
}

@OnWorkerEvent('stalled')
onStalled(jobId: string) {
  console.log('⚠️ STALLED:', jobId);
}

  async process(job: Job<{ 
    candidateId?: string; 
    githubProfileId?: string; 
    githubUsername?: string;
    cached?: boolean;
  }>): Promise<AnalysisResult | void> {
    // console.log("got a job! @signal-compute")
    const { githubProfileId, githubUsername, cached } = job.data;
    this.logger.log(`Starting signal pipeline for profile ${githubProfileId || githubUsername}`);

    try {
      let profile: any;
      let rawData: any;
      let hasSnapshot = false;
      // console.log("cached: ", cached);
      // console.log("githubusername: ", githubUsername);
      if (cached && githubUsername) {
        // Return cached result - job should already be marked complete
        this.logger.log(`Returning cached result for ${githubUsername}`);
        const cacheKey = this.cacheService.buildCacheKey(githubUsername);
        return await this.cacheService.get(cacheKey);
      }

      // Fetch or get existing profile
      if (githubProfileId) {
        profile = await this.prisma.githubProfile.findUnique({
          where: { id: githubProfileId },
          include: { devCandidate: true },
        });

        if (!profile) {
          throw new Error(`GithubProfile ${githubProfileId} not found`);
        }

        // Check if we have a cached snapshot
        if (profile.rawDataSnapshot) {
          rawData = profile.rawDataSnapshot as unknown as GithubRawDataSnapshot;
          hasSnapshot = true;
        }
      }

      // If no snapshot, we need to fetch from GitHub
      if (!hasSnapshot && githubUsername) {
        // Update progress: fetching_repos (20%)
        await this.updateProgress(githubProfileId, 'fetching_repos', 20);
        
        try {
          rawData = await this.githubAdapter.fetchRawData(githubUsername, undefined);
          
          // Cache the snapshot if we have a profile
          if (profile && githubProfileId) {
            await this.prisma.githubProfile.update({
              where: { id: githubProfileId },
              data: { rawDataSnapshot: rawData as any },
            });
          }
        } catch (error) {
          this.logger.error(`Failed to fetch GitHub data for ${githubUsername}: ${error.message}`);
          throw new Error(`Insufficient public data for ${githubUsername}`);
        }
      }

      if (!rawData) {
        throw new Error('No raw data available for analysis');
      }

      // Update progress: analyzing_projects (50%)
      await this.updateProgress(githubProfileId, 'analyzing_projects', 50);

      // Extract signals
      const signals = this.signalExtractor.extract(rawData);

      // Update progress: building_profile (75%)
      await this.updateProgress(githubProfileId, 'building_profile', 75);

      // Score
      const result = this.scoringService.score(rawData);
    
      // Cache the result
      if (githubUsername) {
        const cacheKey = this.cacheService.buildCacheKey(githubUsername);
        // console.log("cached !", cacheKey);
        await this.cacheService.set(cacheKey, result);
      }

      // Update progress: complete (100%)
      await this.updateProgress(githubProfileId, 'complete', 100);

      // Update profile status
      if (githubProfileId) {
        await this.prisma.githubProfile.update({
          where: { id: githubProfileId },
          data: {
            syncStatus: SyncStatus.DONE,
            syncProgress: JSON.stringify({ stage: 'complete', percent: 100 }),
          },
        });
      }

      return result;

    } catch (error) {
      this.logger.error(`Pipeline failed: ${error.message}`);
      // console.log("FAILURE!");
      // Update failure status
      if (githubProfileId) {
        const updated = await this.prisma.githubProfile.update({
          where: { id: githubProfileId },
          data: {
            syncStatus: SyncStatus.FAILED,
            syncProgress: JSON.stringify({ 
              stage: 'failed', 
              percent: 0,
              error: (error as Error).message 
            }),
          },
        }).catch(() => {
          // Ignore update errors during exception handling
        });
        // console.log("UPDATED TO FAILED:", updated.syncStatus);
      }


      throw error;
    }
  }

  private async updateProgress(
    profileId: string | undefined, 
    stage: string, 
    percent: number
  ): Promise<void> {
    if (!profileId) return;

    try {
      await this.prisma.githubProfile.update({
        where: { id: profileId },
        data: {
          syncProgress: JSON.stringify({ stage, percent }),
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to update progress: ${error.message}`);
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
