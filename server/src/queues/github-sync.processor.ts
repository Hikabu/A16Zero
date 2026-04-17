import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { Logger, Inject } from '@nestjs/common';
import { GithubAdapterService } from '../scoring/github-adapter/github-adapter.service';
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

  async process(job: Job<{ candidateId: string; githubProfileId: string }>): Promise<any> {
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
      // (b) Set syncStatus = IN_PROGRESS, syncProgress = FETCHING
      await this.prisma.githubProfile.update({
        where: { id: githubProfileId },
        data: {
          syncStatus: SyncStatus.IN_PROGRESS,
          syncProgress: 'FETCHING',
        },
      });

      // (c) Call adapter methods in parallel
      const token = await this.githubAdapter['decryptToken'](profile.encryptedToken); // Access private method via index for now or make it public if needed
      // Actually, adapter has syncProfile, but user wants specific steps here.
      // I'll use the individual fetch methods I implemented in Step 1.
      
      const [rest, graphql, events] = await Promise.all([
        this.githubAdapter.fetchRestData(profile.githubUserId, profile.githubUsername, token),
        this.githubAdapter.fetchGraphQLData(profile.githubUserId, profile.githubUsername, token),
        this.githubAdapter.fetchEventsData(profile.githubUserId, profile.githubUsername, token),
      ]);

      // (d) Set syncProgress = PROCESSING
      await this.prisma.githubProfile.update({
        where: { id: githubProfileId },
        data: {
          syncProgress: 'PROCESSING',
        },
      });

      // (e) Save raw data, set status = DONE, progress = COMPLETE, lastSyncAt
      const snapshot = {
        rest,
        graphql,
        events,
        fetchedAt: new Date().toISOString(),
      };

      await this.prisma.githubProfile.update({
        where: { id: githubProfileId },
        data: {
          rawDataSnapshot: snapshot as any,
          syncStatus: SyncStatus.DONE,
          syncProgress: 'COMPLETE',
          lastSyncAt: new Date(),
          syncError: null,
        },
      });

      // (f) Enqueue signal-compute
      await this.signalQueue.add('compute-signals', { candidateId, githubProfileId });

      this.logger.log(`GitHub sync completed for profile ${githubProfileId}`);
    } catch (error) {
      this.logger.error(`GitHub sync failed for profile ${githubProfileId}: ${error.message}`);
      
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
