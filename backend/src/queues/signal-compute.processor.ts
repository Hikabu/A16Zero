import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GithubRawDataSnapshot } from '../modules/scoring/github-adapter/types';
import { SyncStatus } from '@prisma/client';
import { AnalysisResult } from '../modules/scoring/types/result.types';
import { ScoringService } from '../modules/scoring/scoring-service/scoring.service';
import { SignalExtractorService } from '../modules/scoring/signal-extractor/signal-extractor.service';
import { GithubAdapterService } from '../modules/scoring/github-adapter/github-adapter.service';
import { CacheService } from '../modules/scoring/cache/cache.service';
import { OnWorkerEvent } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config/dist/config.service';
import { JsonObject } from '@prisma/client/runtime/library';


@Processor('signal-compute', { concurrency: 10 })
export class SignalComputeProcessor extends WorkerHost {
  private readonly logger = new Logger(SignalComputeProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scoringService: ScoringService,
    private readonly signalExtractor: SignalExtractorService,
    private readonly githubAdapter: GithubAdapterService,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(`FAILED job ${job.id}: ${err.message}`);
  }

  async process(job: Job<{
    githubProfileId?: string;   // present  → profile mode (persist to DB)
    githubUsername?: string;    // always required
    cached?: boolean;           // skip recompute if fresh result in Redis
  }>): Promise<AnalysisResult | void> {
    const { githubProfileId, githubUsername, cached } = job.data;

    // Derive mode from presence of profileId — no ambiguity
    const isProfileMode = !!githubProfileId;
    console.log("is profile!: ", isProfileMode);

    this.logger.log(
      `[${isProfileMode ? 'PROFILE' : 'ANON'}] Starting pipeline for ${githubUsername ?? githubProfileId}`,
    );

    // ── 1. Cache hit (both modes) ──────────────────────────────────────────
    if (cached && githubUsername) {
      const cacheKey = this.cacheService.buildCacheKey(githubUsername);
      const hit = await this.cacheService.get(cacheKey);
      if (hit) {
        this.logger.log(`Cache hit for ${githubUsername}`);
        return hit;
      }
      // Cache miss despite cached=true → fall through and recompute
    }

    try {
      // ── 2. Resolve raw data ──────────────────────────────────────────────
      let rawData: any;

      if (isProfileMode) {
        const profile = await this.prisma.githubProfile.findUnique({
          where: { id: githubProfileId },
        });

        if (!profile) throw new Error(`GithubProfile ${githubProfileId} not found`);

        if (profile.rawDataSnapshot) {
          this.logger.log(`Using DB snapshot for profile ${githubProfileId}`);
          rawData = profile.rawDataSnapshot as unknown as GithubRawDataSnapshot;
        }
      }

      // Fetch from GitHub if we still have no data
      if (!rawData) {
        if (!githubUsername) throw new Error('githubUsername required to fetch from GitHub');

        await this.updateProgress(githubProfileId, 'fetching_repos', 20);
        const token = await this.resolveToken(githubProfileId);
        
        try {
          rawData = await this.githubAdapter.fetchRawData(githubUsername, token);
        } catch (err) {
          throw new Error(`Insufficient public data for ${githubUsername}: ${err.message}`);
        }

        // Persist snapshot on the profile so future jobs skip the API call
        if (isProfileMode) {
          await this.prisma.githubProfile.update({
            where: { id: githubProfileId },
            data: { rawDataSnapshot: rawData as any },
          });
        }
      }

      // ── 3. Extract signals → score ───────────────────────────────────────
      await this.updateProgress(githubProfileId, 'building_profile', 75);

      const result = this.scoringService.score(rawData); // ← feed signals, not raw

      // ── 4. Persist result ────────────────────────────────────────────────

      // Always cache in Redis (fast lookup for both modes)
      if (githubUsername) {
        const cacheKey = this.cacheService.buildCacheKey(githubUsername);
        await this.cacheService.set(cacheKey, result);
      }

      // Profile mode: also write scorecard + status back to DB
      console.log(`Computed result for profile ${githubProfileId}: ${JSON.stringify(result)}`);
if (isProfileMode) {
  // GithubProfile: sync metadata only
  await this.prisma.githubProfile.update({
    where: { id: githubProfileId },
    data: {
      syncStatus: SyncStatus.DONE,
      lastSyncAt: new Date(),
      syncProgress: JSON.stringify({ stage: 'complete', percent: 100 }),
    },
  });

  // Candidate: live scorecard (walk up the relation chain)
  const profile = await this.prisma.githubProfile.findUnique({
    where: { id: githubProfileId },
    select: { devCandidate: { select: { candidateId: true } } },
  });

  if (profile?.devCandidate?.candidateId) {
    await this.prisma.candidate.update({
      where: { id: profile.devCandidate.candidateId },
      data: { scorecard: result as any },
    });
  }
}

      await this.updateProgress(githubProfileId, 'complete', 100);
      return result;

    } catch (error) {
      this.logger.error(`Pipeline failed for ${githubUsername ?? githubProfileId}: ${error.message}`);

      if (isProfileMode) {
        await this.prisma.githubProfile.update({
          where: { id: githubProfileId },
          data: {
            syncStatus: SyncStatus.FAILED,
            syncProgress: JSON.stringify({ stage: 'failed', percent: 0, error: error.message }),
          },
        }).catch(() => {/* swallow — don't mask original error */});
      }

      throw error;
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private async resolveToken(githubProfileId?: string): Promise<string> {
    if (githubProfileId) {
      const profile = await this.prisma.githubProfile.findUnique({
        where: { id: githubProfileId },
        select: { encryptedToken: true },
      });
      if (profile?.encryptedToken) {
        try {
          return this.githubAdapter.decryptToken(profile.encryptedToken);
        } catch {
          this.logger.warn(`Could not decrypt token for profile ${githubProfileId}, falling back`);
        }
      }
    }

    const systemToken = this.configService.get<string>('GITHUB_SYSTEM_TOKEN');
    if (!systemToken) throw new Error('GITHUB_SYSTEM_TOKEN not configured');
    return systemToken;
  }

  private async updateProgress(
    profileId: string | undefined,
    stage: string,
    percent: number,
  ): Promise<void> {
    if (!profileId) return;
    try {
      await this.prisma.githubProfile.update({
        where: { id: profileId },
        data: { syncProgress: JSON.stringify({ stage, percent }) },
      });
    } catch (err) {
      this.logger.warn(`Failed to update progress: ${err.message}`);
    }
  }
}