import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { AccountStatus } from '@prisma/client';
import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import cloudinary from '../../cloudinary/cloudinary.config';

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
        githubCooldownUntil: true,
        walletCooldownUntil: true,
        generateCooldownUntil: true,
      },
    });

    return {
      github: { cooldownUntil: candidate?.githubCooldownUntil ?? null },
      wallet: { cooldownUntil: candidate?.walletCooldownUntil ?? null },
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
}
