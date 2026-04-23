import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { Logger, Inject } from '@nestjs/common';
import { GithubAdapterService } from '../modules/scoring/github-adapter/github-adapter.service';
import { PrismaService } from '../prisma/prisma.service';
import { SyncStatus } from '@prisma/client';
import { InjectQueue } from '@nestjs/bullmq';

@Processor('github-sync', { concurrency: 5 })
export class GithubSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(GithubSyncProcessor.name);

  constructor(
    private readonly githubAdapter: GithubAdapterService,
    private readonly prisma: PrismaService,
    @InjectQueue('signal-compute') private readonly signalQueue: Queue,
  ) {
    super();
  }

  async process(
    job: Job<{ candidateId: string; githubProfileId: string }>,
  ): Promise<any> {
    const { candidateId, githubProfileId } = job.data;
    this.logger.log(`Starting GitHub sync for profile ${githubProfileId}`);

    // (a) Load GithubProfile
    const profile = await this.prisma.githubProfile.findUnique({
      where: { id: githubProfileId },
    });

    if (!profile) {
      throw new Error(`GithubProfile ${githubProfileId} not found`);
    }

    try {
      // (b) Set syncStatus = IN_PROGRESS, syncProgress = fetching_repos (20%)
      await this.prisma.githubProfile.update({
        where: { id: githubProfileId },
        data: {
          syncStatus: SyncStatus.IN_PROGRESS,
          syncProgress: JSON.stringify({
            stage: 'fetching_repos',
            percent: 20,
          }),
        },
      });

      // (c) Call consolidated fetcher
      const token = await this.githubAdapter['decryptToken'](
        profile.encryptedToken,
      );
      const rawData = await this.githubAdapter.fetchRawData(
        profile.githubUsername,
        token,
      );

      // (d) Set syncProgress = analyzing_projects (40% - interim)
      // Note: We'll jump to 60% in signal-compute processor
      await this.prisma.githubProfile.update({
        where: { id: githubProfileId },
        data: {
          syncProgress: JSON.stringify({
            stage: 'analyzing_projects',
            percent: 40,
          }),
        },
      });

      // (e) Save raw data, keep status = IN_PROGRESS, lastSyncAt
      await this.prisma.githubProfile.update({
        where: { id: githubProfileId },
        data: {
          rawDataSnapshot: rawData as any,
          lastSyncAt: new Date(),
          syncError: null,
        },
      });

      // (f) Enqueue signal-compute
      await this.signalQueue.add(
        'compute-signals',
        {
          candidateId,
          githubProfileId,
        },
        {
          attempts: process.env.NODE_ENV === 'test' ? 1 : 3,
        },
      );

      this.logger.log(`GitHub sync completed for profile ${githubProfileId}`);
    } catch (error) {
      this.logger.error(
        `GitHub sync failed for profile ${githubProfileId}: ${error.message}`,
      );

      // (g) On error: set status = FAILED, syncError = error.message
      await this.prisma.githubProfile.update({
        where: { id: githubProfileId },
        data: {
          syncStatus: SyncStatus.FAILED,
          syncError: error.message,
        },
      });

      throw error;
    }
  }
}
