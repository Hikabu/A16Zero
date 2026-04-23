import { Processor } from '@nestjs/bullmq'; 
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
import { SolanaAdapterService } from '../modules/scoring/web3-adapter/solana-adapter.service';
import { Web3MergeService } from '../modules/scoring/web3-merge/web3-merge.service';


@Processor('signal-compute', { concurrency: 10 })
export class SignalComputeProcessor {
  private readonly logger = new Logger(SignalComputeProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scoringService: ScoringService,
    private readonly signalExtractor: SignalExtractorService,
    private readonly githubAdapter: GithubAdapterService,
    private readonly cacheService: CacheService,
    private readonly solanaAdapter: SolanaAdapterService,
    private readonly web3MergeService: Web3MergeService,
  ) {}


  async process(
    job: Job<{
      candidateId?: string;
      githubProfileId?: string;
      githubUsername?: string;
      walletAddress?: string;
      cached?: boolean;
    }>,
  ): Promise<AnalysisResult | void> {
    const pipelineStart = Date.now();
    const { githubProfileId, githubUsername, walletAddress, cached } = job.data;

    this.logger.log(
      `Starting signal pipeline for profile ${
        githubProfileId || githubUsername || walletAddress
      }`,
    );

	type AnalysisMode = 'github-only' | 'github+wallet' | 'wallet-only';
    const mode: AnalysisMode =
      githubUsername && walletAddress
        ? 'github+wallet'
        : walletAddress
          ? 'wallet-only'
          : 'github-only';

    try {
      let profile: any;
      let rawData: any;
      let hasSnapshot = false;

      if (cached && (githubUsername || walletAddress)) {
        // Return cached result - job should already be marked complete
        this.logger.log(
          `Returning cached result for ${githubUsername || walletAddress}`,
        );
        const cacheKey = this.cacheService.buildCacheKey(
          githubUsername,
          walletAddress,
        );
        let cachedResult = await this.cacheService.get(cacheKey);
        if (cachedResult) {
          // S15 — Vouch signal (Always live)
          cachedResult = await this.applyVouchSignal(cachedResult, job.data);

          this.logger.log(
            {
              jobId: job.id,
              mode,
              durationMs: Date.now() - pipelineStart,
            },
            'analysis_complete',
          );
          return cachedResult;
        }
      }

      // Fetch or get existing profile for modes involving GitHub
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

      let web3Data: any = null;

      if (mode === 'wallet-only') {
        web3Data = await this.solanaAdapter.fetchOnChainData(walletAddress!);
        let result: AnalysisResult = {
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
          reputation: null,
          stack: { languages: [], tools: [] },
          summary:
            'On-chain developer profile. Insufficient public GitHub data to assess software capabilities.',
          web3: web3Data,
        };

        if (web3Data && web3Data.deployedPrograms) {
          result = this.web3MergeService.applyWalletUpgrades(
            result,
            web3Data.deployedPrograms,
            result.stack.languages,
          );
          result.web3 = web3Data;
        }

        // Cache the base result (NO vouches)
        if (walletAddress) {
          const cacheKey = this.cacheService.buildCacheKey(
            undefined,
            walletAddress,
          );
          await this.cacheService.set(cacheKey, result);
        }

        // S15 — Vouch signal (Live)
        result = await this.applyVouchSignal(result, job.data);

        this.logger.log(
          {
            jobId: job.id,
            mode,
            durationMs: Date.now() - pipelineStart,
          },
          'analysis_complete',
        );
        return result;
      }

      // Modes involving GitHub: 'github-only' and 'github+wallet'
      if (!hasSnapshot && githubUsername) {
        await this.updateProgress(githubProfileId, 'fetching_repos', 20);

        try {
          const token = profile?.encryptedToken
            ? this.githubAdapter.decryptToken(profile.encryptedToken)
            : '';

          if (mode === 'github+wallet') {
            const [gitResponse, w3Response] = await Promise.all([
              this.githubAdapter.fetchRawData(githubUsername, token),
              this.solanaAdapter.fetchOnChainData(walletAddress!),
            ]);
            rawData = gitResponse;
            web3Data = w3Response;
          } else {
            rawData = await this.githubAdapter.fetchRawData(
              githubUsername,
              token,
            );
          }

          if (profile && githubProfileId) {
            await this.prisma.githubProfile.update({
              where: { id: githubProfileId },
              data: { rawDataSnapshot: rawData },
            });
          }
        } catch (error) {
          this.logger.error(
            `Failed to fetch data for ${githubUsername}: ${error.message}`,
          );
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
      let result = this.scoringService.score(rawData, walletAddress);

      // Inject web3 data if present
      if (web3Data) {
        result = this.web3MergeService.applyWalletUpgrades(
          result,
          web3Data.deployedPrograms,
          result.stack.languages,
        );
        result.web3 = web3Data;
      }

      // Cache the result (NO vouches)
      if (githubUsername || walletAddress) {
        const cacheKey = this.cacheService.buildCacheKey(
          githubUsername,
          walletAddress,
        );
        await this.cacheService.set(cacheKey, result);
      }

      // S15 — Vouch signal (Live)
      result = await this.applyVouchSignal(result, job.data);

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

      this.logger.log(
        {
          jobId: job.id,
          mode,
          durationMs: Date.now() - pipelineStart,
        },
        'analysis_complete',
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Pipeline failed for ${githubUsername || walletAddress}: ${error.message}`,
        error.stack,
      );

      // Update failure status
      if (githubProfileId) {
        try {
          await this.prisma.githubProfile.update({
            where: { id: githubProfileId },
            data: {
              syncStatus: SyncStatus.FAILED,
              syncProgress: JSON.stringify({
                stage: 'failed',
                percent: 0,
                error: (error as Error).message,
              }),
            },
          });
        } catch (updateError) {
          this.logger.warn(
            `Failed to update profile status on failure: ${updateError.message}`,
          );
        }
      }

      throw error;
    }
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
        data: {
          syncProgress: JSON.stringify({ stage, percent }),
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to update progress: ${error.message}`);
    }
  }

  private async applyVouchSignal(
    result: AnalysisResult,
    jobData: { githubUsername?: string; candidateUsername?: string },
  ): Promise<AnalysisResult> {
    const now = new Date();

    // Resolve candidateId from job data — vouches are candidate-scoped, not github-scoped
    const candidate = await this.prisma.candidate.findFirst({
      where: {
        OR: [
          {
            devProfile: {
              githubProfile: { githubUsername: jobData.githubUsername },
            },
          },
          { user: { username: jobData.candidateUsername } },
        ],
      },
    });

    const activeVouches = candidate
      ? await this.prisma.vouch.findMany({
          where: {
            candidateId: candidate.id,
            isActive: true,
            expiresAt: { gt: now },
            flag: null,
            weight: { in: ['verified', 'standard'] },
          },
          orderBy: { confirmedAt: 'desc' },
          take: 10,
        })
      : [];

    const vouchCount = activeVouches.length;
    const verifiedVouchCount = activeVouches.filter(
      (v) => v.weight === 'verified',
    ).length;

    return this.web3MergeService.applyVouchUpgrades(
      result,
      vouchCount,
      verifiedVouchCount,
      activeVouches,
    );
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
      reputation: null,
      stack: {
        languages: [],
        tools: [],
      },
      web3: null,
    };
  }
}
