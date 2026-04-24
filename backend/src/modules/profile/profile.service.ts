import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { AccountStatus } from '@prisma/client';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── User Profile ─────────────────────────────────────────────────────────

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        accountStatus: true,
        isEmailVerified: true,
        mfaEnabled: true,
        createdAt: true,
        updatedAt: true,
        authAccounts: {
          select: {
            provider: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    return user;
  }

  async updateProfile(userId: string, dto: UpdateUserDto) {
    // Check username uniqueness if being changed
    if (dto.username) {
      const existing = await this.prisma.user.findUnique({
        where: { username: dto.username },
      });
      if (existing && existing.id !== userId) {
        throw new ConflictException('Username is already taken');
      }
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.username !== undefined && { username: dto.username }),
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        updatedAt: true,
      },
    });
  }

  async deactivateAccount(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { accountStatus: AccountStatus.SUSPENDED },
    });

    return { message: 'Account deactivated successfully' };
  }

  // ─── Candidate Profile ────────────────────────────────────────────────────

  async getCandidateProfile(userId: string) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { userId },
      select: {
        id: true,
        bio: true,
        careerPath: true,
        scorecard: true,
        createdAt: true,
        devProfile: {
          select: {
            id: true,
            createdAt: true,
            githubProfile: {
              select: {
                githubUsername: true,
                syncStatus: true,
                lastSyncAt: true,
                syncProgress: true,
              },
            },
            web3Profile: true,
          },
        },
      },
    });

    if (!candidate) throw new NotFoundException('Candidate profile not found');

    return candidate;
  }

  async updateCandidateProfile(userId: string, dto: UpdateCandidateDto) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { userId },
    });

    if (!candidate) throw new NotFoundException('Candidate profile not found');

    return this.prisma.candidate.update({
      where: { userId },
      data: {
        ...(dto.bio !== undefined && { bio: dto.bio }),
        ...(dto.careerPath !== undefined && { careerPath: dto.careerPath }),
      },
      select: {
        id: true,
        bio: true,
        careerPath: true,
        createdAt: true,
      },
    });
  }

  // ─── GitHub Connection ────────────────────────────────────────────────────

  async getConnectedGithub(userId: string) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { userId },
      select: {
        devProfile: {
          select: {
            githubProfile: {
              select: {
                githubUsername: true,
                githubUserId: true,
                scopes: true,
                syncStatus: true,
                syncProgress: true,
                lastSyncAt: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!candidate) throw new NotFoundException('Candidate profile not found');

    const github = candidate.devProfile?.githubProfile ?? null;

    return {
      connected: !!github,
      github,
    };
  }
}
