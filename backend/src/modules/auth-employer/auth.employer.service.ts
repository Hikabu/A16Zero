import {
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';

import { PrismaService } from '../../prisma/prisma.service';

import { PrivyAuthUser } from './privyAuth';
import Redis from 'ioredis';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthEmployerService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    @Inject('REDIS') private readonly redis: Redis,
  ) {}

  private readonly refreshTokenTtlSeconds = 60 * 60 * 24 * 30;

  async login(privyUser: PrivyAuthUser) {
    const { privyUserId, email, walletAddress } =
      privyUser;

    if (!privyUserId) {
      throw new UnauthorizedException(
        'Invalid Privy token',
      );
    }

    let company =
      await this.prisma.company.findUnique({
        where: { privyId: privyUserId },
      });

    if (!company && email) {
      company =
        await this.prisma.company.findUnique({
          where: { email },
        });
    }

    if (!company && walletAddress) {
      company =
        await this.prisma.company.findUnique({
          where: { walletAddress },
        });
    }

    if (company) {
      company =
        await this.prisma.company.update({
          where: { id: company.id },
          data: {
            privyId: privyUserId,
            email: email ?? undefined,
            walletAddress:
              walletAddress ?? undefined,
            smartAccountAddress:
              walletAddress ?? undefined,
          },
        });
    } else {
      company =
        await this.prisma.company.create({
          data: {
            privyId: privyUserId,
            email: email ?? null,
            walletAddress:
              walletAddress ?? null,
            smartAccountAddress:
              walletAddress ?? null,
            name: 'New company',
            country: 'Unknown',
            isVerified: true,
          },
        });
    }

    return this.issueTokens(company.id);
  }

  async refresh(payload: any) {
    const company =
      await this.prisma.company.findUnique({
        where: {
          id: payload.sub,
        },
      });

    if (!company) {
      throw new UnauthorizedException(
        'Company not found',
      );
    }

    return this.issueTokens(company.id, payload.jti);
  }

  async logout(companyId: string) {
    await this.redis.del(`refresh:employer:${companyId}`);
  }

  private async issueTokens(companyId: string, expectedRefreshJti?: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new UnauthorizedException('Company not found');
    }

    const accessPayload = {
      sub: company.id,
      role: 'employer',
      walletAddress: company.walletAddress,
      privyId: company.privyId,
    };

    const accessToken = this.jwtService.sign(
      {
        ...accessPayload,
        jti: crypto.randomUUID(),
      },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: (this.config.get<string>('JWT_EXPIRY') || '15m') as any,
      },
    );

    const refreshJti = crypto.randomUUID();
    const refreshToken = this.jwtService.sign(
      {
        sub: company.id,
        role: 'employer',
        jti: refreshJti,
      },
      {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: (this.config.get<string>('JWT_REFRESH_EXPIRY') || '30d') as any,
      },
    );

    const refreshKey = `refresh:employer:${company.id}`;
    if (expectedRefreshJti) {
      const rotationResult = await this.redis.eval(
        `
          local current = redis.call("GET", KEYS[1])
          if not current then
            return -1
          end
          if current ~= ARGV[1] then
            redis.call("DEL", KEYS[1])
            return 0
          end
          redis.call("SET", KEYS[1], ARGV[2], "EX", ARGV[3])
          return 1
        `,
        1,
        refreshKey,
        expectedRefreshJti,
        refreshJti,
        this.refreshTokenTtlSeconds.toString(),
      );

      if (Number(rotationResult) !== 1) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }
    } else {
      await this.redis.set(
        refreshKey,
        refreshJti,
        'EX',
        this.refreshTokenTtlSeconds,
      );
    }

    return {
      accessToken,
      refreshToken,
      role: 'employer',
      username: company.name,

      user: {
        id: company.id,
        name: company.name,
        email: company.email,
        walletAddress: company.walletAddress,
        privyUserId: company.privyId,
      },
    };
  }
}
