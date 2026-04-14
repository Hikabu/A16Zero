import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import Redis from 'ioredis';
import * as bcrypt from 'bcrypt';

type Provider = 'LOCAL' | 'GITHUB' | 'GOOGLE';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    @Inject('REDIS') private readonly redis: Redis
  ) {}

  async register(dto: any) {
    const hash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        authAccounts: {
          create: {
            provider: 'LOCAL',
            providerId: dto.email,
            passwordHash: hash,
          },
        },
      },
    });

    return this.issueTokens(user.id);
  }

  async login(dto: any) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.identifier },
          { username: dto.identifier },
        ],
      },
      include: { authAccounts: true },
    });

    if (!user) throw new UnauthorizedException();

    const account = user.authAccounts.find(
      (a) => a.provider === 'LOCAL'
    );

    if (!account || !account.passwordHash)
      throw new UnauthorizedException();

    const isValid = await bcrypt.compare(
      dto.password,
      account.passwordHash
    );

    if (!isValid) throw new UnauthorizedException();

    return this.issueTokens(user.id);
  }

  async refresh(user: any) {
    const stored = await this.redis.get(`refresh:${user.id}`);

    if (!stored) throw new UnauthorizedException();

    return this.issueTokens(user.id);
  }


  async logout(user: any) {
    await this.redis.del(`refresh:${user.id}`);
    return { message: 'Logged out' };
  }

  private async issueTokens(userId: string) {
    const accessToken = this.jwt.sign(
      { sub: userId },
      { expiresIn: '15m' }
    );

    const refreshToken = this.jwt.sign(
      { sub: userId },
      { expiresIn: '7d' }
    );

    await this.redis.set(
      `refresh:${userId}`,
      refreshToken,
      'EX',
      60 * 60 * 24 * 7
    );

    return {
      accessToken,
      refreshToken,
    };
  }

async oauthLogin(profile: any, provider: Provider) {
  if (!profile) throw new UnauthorizedException();

  // 1. Try find by provider
  let account = await this.prisma.authAccount.findUnique({
    where: {
      provider_providerId: {
        provider,
        providerId: profile.id,
      },
    },
    include: { user: true },
  });

  // CASE 1: provider exists → login
  if (account) {
    return this.issueTokens(account.user.id);
  }

  // 2. Try find user by email
  const user = await this.prisma.user.findUnique({
    where: { email: profile.email },
    include: { authAccounts: true },
  });

  // CASE 2: user exists → LINK automatically
  if (user) {
    await this.prisma.authAccount.create({
      data: {
        userId: user.id,
        provider,
        providerId: profile.id,
      },
    });

    return this.issueTokens(user.id);
  }

  // CASE 3: totally new → onboarding
  const tempToken = this.jwt.sign(
    {
      oauth: {
        provider,
        providerId: profile.id,
        email: profile.email,
        username: profile.username,
        firstName: profile.firstName,
        lastName: profile.lastName,
      },
      type: 'onboarding',
    },
    { expiresIn: '15m' }
  );

  return {
    needsOnboarding: true,
    tempToken,
  };
}
async linkOAuth(user: any, profile: any, provider: Provider) {
  if (!user) throw new UnauthorizedException();

  // 1. Check if already linked
  const existing = await this.prisma.authAccount.findUnique({
    where: {
      provider_providerId: {
        provider,
        providerId: profile.id,
      },
    },
  });

  if (existing) {
    throw new UnauthorizedException('Account already linked');
  }

  // 2. Attach to current user
  await this.prisma.authAccount.create({
    data: {
      userId: user.id,
      provider,
      providerId: profile.id,
    },
  });

  return { message: `${provider} linked successfully` };
}

async completeOnboarding(dto: any, authHeader: string) {
  if (!authHeader) throw new UnauthorizedException();

  const token = authHeader.split(' ')[1];

  let payload: any;

  try {
    payload = this.jwt.verify(token);
  } catch {
    throw new UnauthorizedException();
  }

  if (payload.type !== 'onboarding') {
    throw new UnauthorizedException();
  }

  const oauth = payload.oauth;

  // Prevent duplicate username
  const exists = await this.prisma.user.findUnique({
    where: { username: dto.username },
  });

  if (exists) {
    throw new Error('Username already taken');
  }

  // Create full user
  const user = await this.prisma.user.create({
    data: {
      email: oauth.email,
      username: dto.username,
      firstName: oauth.firstName,
      lastName: oauth.lastName,
      authAccounts: {
        create: {
          provider: oauth.provider,
          providerId: oauth.providerId,
        },
      },
    },
  });

  return this.issueTokens(user.id);
}

}