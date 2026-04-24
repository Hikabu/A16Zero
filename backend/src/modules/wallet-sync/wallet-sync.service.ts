import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import Redis from 'ioredis';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { PublicKey } from '@solana/web3.js';

@Injectable()
export class WalletSyncService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('REDIS') private readonly redis: Redis,
  ) {}

  async generateChallenge(userId: string): Promise<string> {
    const randomHex = Math.random().toString(16).substring(2, 8);
    const timestamp = Date.now();
    const challenge = `link-wallet:${userId}:${timestamp}:${randomHex}`;

    await this.redis.set(`wallet-challenge:${userId}`, challenge, 'EX', 300);

    return challenge;
  }

  async linkWallet(
    userId: string,
    walletAddress: string,
    signature: string,
  ): Promise<{ linked: boolean; solanaAddress: string }> {
    // Step 1 — validate walletAddress format
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress)) {
      throw new BadRequestException('Invalid Solana wallet address');
    }

    // Step 2 — retrieve challenge
    const challenge = await this.redis.get(`wallet-challenge:${userId}`);
    if (!challenge) {
      throw new NotFoundException('Challenge expired or not found');
    }

    // Step 3 — verify signature
    try {
      const msgBytes = Buffer.from(challenge, 'utf8');
      const sigBytes = bs58.decode(signature);
      const pubkeyBytes = new PublicKey(walletAddress).toBytes();

      const valid = nacl.sign.detached.verify(msgBytes, sigBytes, pubkeyBytes);
      if (!valid) {
        throw new UnauthorizedException('Wallet signature invalid');
      }
    } catch (err) {
      throw new UnauthorizedException(
        `Verification failed: ${(err as Error).message}`,
      );
    }

    // Step 4 — delete challenge
    await this.redis.del(`wallet-challenge:${userId}`);

    // Step 5 — upsert Web3Profile
    // We need to make sure the developerCandidate exists first
    const candidate = await this.prisma.candidate.findUnique({
      where: { userId },
      include: { devProfile: true },
    });

    if (!candidate || !candidate.devProfile) {
      throw new NotFoundException('Candidate profile not found');
    }

    await this.prisma.web3Profile.upsert({
      where: { userId },
      create: {
        userId,
        solanaAddress: walletAddress,
        devCandidateId: candidate.devProfile.id,
      },
      update: {
        solanaAddress: walletAddress,
      },
    });

    return { linked: true, solanaAddress: walletAddress };
  }
}
