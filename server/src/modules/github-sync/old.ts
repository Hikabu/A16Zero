import { Injectable, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SyncStatus } from '@prisma/client';
import { check } from 'zod';

@Injectable()
export class GithubSyncService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('github-sync') private readonly githubSyncQueue: Queue,
  ) {}

async triggerSync(userId: string) {
  // 1. Ensure Candidate exists
  let checkCandidate = await this.prisma.candidate.upsert({
    where: { userId },
    create: {
      user: { connect: { id: userId } },
      careerPath: 1, // DEVELOPER bitmask default
    },
    update: {},
    include: {
      devProfile: {
        include: { githubProfile: true },
      },
    },
  });

  let candidate;

  // 2. Ensure DeveloperCandidate exists
  if (!checkCandidate.devProfile) {
    await this.prisma.developerCandidate.create({
      data: {
        candidate: { connect: { id: checkCandidate.id } },
      },
    });
    candidate = await this.prisma.candidate.findUnique({
      where: { userId },
      include: {
        devProfile: {
          include: { githubProfile: true },
        },
      },
    });

    // Re-fetch with full chain
  }
  else {
    candidate = checkCandidate;
  }

  // 3. GithubProfile MUST exist — can't create without a real OAuth token
  const githubProfile = candidate.devProfile.githubProfile;
  if (!githubProfile) {
    throw new NotFoundException(
      'GitHub account not connected. Please redirect to /auth/github/link to connect your GitHub account',
    );
  }

  // 4. Rate limit: 24h
  if (githubProfile.lastSyncAt) {
    const diffHours =
      (Date.now() - new Date(githubProfile.lastSyncAt).getTime()) /
      (1000 * 60 * 60);

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

  // 5. Mark PENDING
  const updated = await this.prisma.githubProfile.update({
    where: { id: githubProfile.id },
    data: {
      syncStatus: SyncStatus.PENDING,
      syncProgress: '0',
    },
  });

  // 6. Enqueue with correct IDs
  await this.githubSyncQueue.add('sync-profile', {
    candidateId: candidate.id,
    devCandidateId: candidate.devProfile.id,
    githubProfileId: githubProfile.id,
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