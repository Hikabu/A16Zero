import { Injectable, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SyncStatus } from '@prisma/client';

@Injectable()
export class GithubSyncService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('github-sync') private readonly githubSyncQueue: Queue,
  ) {}

  async triggerSync(userId: string) {
    const profile = await this.prisma.githubProfile.findFirst({
      where: {
        devCandidate: {
          candidate: {
            userId: userId,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('GitHub profile not found for this user');
    }

    // Rate limit: 24h
    if (profile.lastSyncAt) {
      const now = new Date();
      const lastSync = new Date(profile.lastSyncAt);
      const diffMs = now.getTime() - lastSync.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours < 24) {
        throw new HttpException(
          {
            message: 'Rate limit: You can only sync once every 24 hours.',
            retryAfter: Math.ceil(24 - diffHours),
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    // Set to PENDING
    const updated = await this.prisma.githubProfile.update({
      where: { id: profile.id },
      data: {
        syncStatus: SyncStatus.PENDING,
        syncProgress: '0',
      },
    });

    // Enqueue job
    await this.githubSyncQueue.add('sync-profile', {
      candidateId: profile.devCandidateId, // Using devCandidateId as placeholder for candidate context if needed
      githubProfileId: profile.id,
    });

    return updated;
  }

  async getSyncStatus(userId: string) {
    const profile = await this.prisma.githubProfile.findFirst({
      where: {
        devCandidate: {
          candidate: {
            userId: userId,
          },
        },
      },
      select: {
        syncStatus: true,
        syncProgress: true,
        lastSyncAt: true,
        syncError: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('GitHub profile not found for this user');
    }

    return profile;
  }
}
