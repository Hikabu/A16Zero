import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { AccountStatus, Prisma } from '@prisma/client';
import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import cloudinary from '../../cloudinary/cloudinary.config';
import { CacheService } from '../scoring/cache/cache.service';

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService
  ) {}

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
        name: true,

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

async getPublicProfile(username: string) {
  const user = await this.prisma.user.findUnique({
    where: { username },

    select: {
      username: true,

      candidate: {
        select: {
          bio: true,
          location: true,
          website: true,
          careerPath: true,
          avatarUrl: true, 

          vouches: {
            where: {
              isActive: true,
            },

            orderBy: {
              confirmedAt: 'desc',
            },

            select: {
              id: true,
              message: true,
              voucherWallet: true,
              weight: true,
              confirmedAt: true,
            },
          },
        },
      },
    },
  });

  

  if (!user) {
    throw new NotFoundException(
      'Profile not found',
    );
  }

  const enrichedVouches = await Promise.all(
  (user.candidate?.vouches ?? []).map(
    async (vouch) => {
      const linkedWallet =
        await this.prisma.web3Profile.findFirst({
          where: {
            solanaAddress: vouch.voucherWallet,
          },

          select: {
            developerProfile: {
              select: {
                candidate: {
                  select: {
                    user: {
                      select: {
                        username: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });

      const voucherUsername = linkedWallet?.developerProfile?.candidate?.user?.username ?? null;

      return {
        ...vouch,

        voucherUser: voucherUsername,
      };
    },
  ),
);

  return {
    username: user.username,

    bio: user.candidate?.bio ?? null,

    location:
      user.candidate?.location ?? null,
       avatarUrl: user.candidate?.avatarUrl ?? null,

    website:
      user.candidate?.website ?? null,

    careerPath:
      user.candidate?.careerPath ?? 1,

    vouches:
      enrichedVouches,
  };
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
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.username !== undefined && { username: dto.username }),

      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        name: true,
        updatedAt: true,

      },
    });
  }
async deleteAccount(userId: string) {
  // Optional: suspend immediately so sessions/UI lock instantly
  await this.deactivateAccount(userId);

  // Fetch candidate profile BEFORE deletion
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    include: {
      candidate: {
        include: {
          devProfile: {
            include: {
              githubProfile: true,
              web3Profile: true,
            },
          },
        },
      },
    },
  });

  const githubUsername =
    user?.candidate?.devProfile?.githubProfile?.githubUsername;

  const walletAddress =
    user?.candidate?.devProfile?.web3Profile?.solanaAddress;

  // Build all possible cache keys
  const cacheKeys = [
    githubUsername
      ? this.cacheService.buildCacheKey(githubUsername, undefined)
      : null,

    walletAddress
      ? this.cacheService.buildCacheKey(undefined, walletAddress)
      : null,

    githubUsername && walletAddress
      ? this.cacheService.buildCacheKey(
          githubUsername,
          walletAddress,
        )
      : null,
  ].filter(Boolean) as string[];

  // Delete cache entries
  if (cacheKeys.length > 0) {
    await this.prisma.cachedResult.deleteMany({
      where: {
        cacheKey: {
          in: cacheKeys,
        },
      },
    });
  }

  // Delete user (cascade wipes everything else)
  await this.prisma.user.delete({
    where: { id: userId },
  });

  return {
    message: 'Account deleted successfully',
  };
}

  async deactivateAccount(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { accountStatus: AccountStatus.SUSPENDED },
    });

    return { message: 'Account deactivated successfully' };
  }

  async getCooldowns(userId: string) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { userId },
      select: {
        generateCooldownUntil: true,
        devProfile: {
          select: {
            githubCooldownUntil: true,
            walletCooldownUntil: true,
          },
        },
      },
    });

    return {
      github: { cooldownUntil: candidate?.devProfile?.githubCooldownUntil ?? null },
      wallet: { cooldownUntil: candidate?.devProfile?.walletCooldownUntil ?? null },
      generate: { cooldownUntil: candidate?.generateCooldownUntil ?? null },
    };
  }

  // ─── Candidate Profile ────────────────────────────────────────────────────

  async getCandidateProfile(userId: string) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { userId },
      select: {
        id: true,
        bio: true,
        location: true,
        website: true,
        careerPath: true,
avatarUrl: true, 
        scorecard: true,
        createdAt: true,
        vouches: true,
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

  if (!candidate) {
    throw new NotFoundException('Candidate profile not found');
  }

  return this.prisma.candidate.update({
    where: { userId },
    data: {
      ...(dto.bio !== undefined && { bio: dto.bio }),
      ...(dto.location !== undefined && { location: dto.location }),
      ...(dto.website !== undefined && { website: dto.website }),
      ...(dto.careerPath !== undefined && { careerPath: dto.careerPath }),

      ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
    },
    select: {
      id: true,
      bio: true,
      location: true,
      website: true,
      careerPath: true,
      avatarUrl: true,
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

  // ─── Wallet Connection ────────────────────────────────────────────────────

  async getConnectedWallet(userId: string) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { userId },
      select: {
        devProfile: {
          select: {
            web3Profile: {
              select: {
                solanaAddress: true,
                verifiedContracts: true,
                onChainMetrics: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!candidate) throw new NotFoundException('Candidate profile not found');

    const web3 = candidate.devProfile?.web3Profile ?? null;

    return {
      connected: !!web3,
      web3,
    };
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
  if (!file) throw new Error('No file provided');

  const result = await new Promise<any>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: 'avatars',
          transformation: [
            { width: 300, height: 300, crop: 'fill', gravity: 'face' },
            { quality: 'auto:good', fetch_format: 'auto' },
          ],
          strip_metadata: true,
        },
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        },
      )
      .end(file.buffer);
  });

  const avatarUrl = result.secure_url;

  // FIXED: use userId (not req)
  await this.prisma.candidate.upsert({
  where: { userId },
  update: {
    avatarUrl,
  },
  create: {
    userId,
    avatarUrl,
  },
});
  return { url: avatarUrl };
}

async searchPublicProfiles(
  query: string,
  sort: string = 'recent',
) {
  const orderBy: Prisma.UserOrderByWithRelationInput =
    (() => {
      switch (sort) {
        case 'name':
          return {
            username: 'asc',
          };

        case 'career':
          return {
            candidate: {
              careerPath: 'asc',
            },
          };

        case 'recent':
        default:
          return {
            createdAt: 'desc',
          };
      }
    })();

  const users = await this.prisma.user.findMany({
    where: {
      accountStatus: AccountStatus.ACTIVE,

      candidate: {
        isNot: null,
      },

      ...(query.length > 0 && {
        username: {
          contains: query,
          mode: 'insensitive',
        },
      }),
    },

    select: {
      username: true,
      createdAt: true,

      candidate: {
        select: {
          bio: true,
          location: true,
          avatarUrl: true,
          careerPath: true,
        },
      },
    },

    orderBy,

    take: 20,
  });

  return {
    profiles: users.map((u) => ({
      username: u.username,
      bio: u.candidate?.bio ?? null,
      location: u.candidate?.location ?? null,
      avatarUrl: u.candidate?.avatarUrl ?? null,
      careerPath: u.candidate?.careerPath ?? null,
    })),
  };
}

}

