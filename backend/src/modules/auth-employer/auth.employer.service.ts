import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';

import { PrismaService } from '../../prisma/prisma.service';

import { PrivyAuthUser } from './privyAuth';

@Injectable()
export class AuthEmployerService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

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

    const payload = {
      sub: company.id,
      role: 'employer',
      walletAddress: company.walletAddress,
      privyId: company.privyId,
    };

    const accessToken = this.jwtService.sign(
      payload,
      {
        expiresIn: '15m',
      },
    );

    const refreshToken = this.jwtService.sign(
      payload,
      {
        expiresIn: '7d',
      },
    );

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

    const newPayload = {
      sub: company.id,
      role: 'employer',
      walletAddress: company.walletAddress,
      privyId: company.privyId,
    };

    const accessToken = this.jwtService.sign(
      newPayload,
      {
        expiresIn: '15m',
      },
    );

    return {
      accessToken,
    };
  }
}