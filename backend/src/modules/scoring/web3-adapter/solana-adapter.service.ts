import { Injectable, Inject, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { Connection, PublicKey } from '@solana/web3.js';
import { AchievementWhitelistService } from './achievement-whitelist.service';

export interface Achievement {
  type: 'bounty_completion';
  source: 'superteam';
  label: string;
  year: number;
}

export interface ProgramInfo {
  programId: string;
  deployedAt: string | null;
  isActive: boolean;
  uniqueCallers: number;
  upgradeCount: number;
}

@Injectable()
export class SolanaAdapterService {
  private readonly logger = new Logger(SolanaAdapterService.name);

  private readonly BPF_LOADER = new PublicKey(
    'BPFLoaderUpgradeab1e11111111111111111111111',
  );
  private readonly BPF_LOADER_UPGRADEABLE = new PublicKey(
    'BPFLoaderUpgradeab1e11111111111111111111111',
  );
  private readonly AUTHORITY_OFFSET = 13;

  constructor(
    private readonly config: ConfigService,
    @Inject('REDIS') private readonly redis: Redis,
    private readonly achievementWhitelist: AchievementWhitelistService,
  ) {
	  console.log('HELIUS KEY:', this.config.get('HELIUS_API_KEY'));

  }

  async fetchProgramsByAuthority(
    walletAddress: string,
  ): Promise<ProgramInfo[]> {
    const cacheKey = `solana:programs:${walletAddress}`;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      // Ignore cache check errors
    }

    try {
      const usingDevnet = this.config.get<string>('USING_DEVNET') === 'true';

const solanaRpcUrl = usingDevnet
  ? this.config.get<string>('SOLANA_DEVNET_RPC_URL')
  : this.config.get<string>('SOLANA_RPC_URL');

this.logger.log(`Using RPC: ${solanaRpcUrl}`);
      if (!solanaRpcUrl) {
        this.logger.warn('SOLANA_RPC_URL is not configured');
        return [];
      }

      const connection = new Connection(solanaRpcUrl);

      const accounts = await connection.getProgramAccounts(this.BPF_LOADER, {
        filters: [
          { memcmp: { offset: this.AUTHORITY_OFFSET, bytes: walletAddress } },
        ],
      });

      const programs: ProgramInfo[] = [];
      for (const account of accounts) {
        const programId = account.pubkey.toBase58();
        const [traction, upgradeCount] = await Promise.all([
          this.fetchProgramTraction(programId, connection),
          this.fetchUpgradeCount(programId, connection),
        ]);
        programs.push({
          programId,
          ...traction,
          upgradeCount,
        });
      }

      try {
        await this.redis.set(cacheKey, JSON.stringify(programs), 'EX', 604800);
      } catch (e) {
        // Ignore cache setting errors
      }

      return programs;
    } catch (err) {
      this.logger.warn({ walletAddress, err }, 'solana_rpc_fail');
      return []; // never throw, graceful degradation
    }
  }

  async fetchProgramTraction(
    programId: string,
    connection: Connection,
  ): Promise<{
    uniqueCallers: number;
    isActive: boolean;
    deployedAt: string | null;
  }> {
    try {
      const sigs = await connection.getSignaturesForAddress(
        new PublicKey(programId),
        { limit: 500 },
      );
      const uniqueCallers = new Set(
        sigs.filter((s: any) => s.feePayer).map((s: any) => s.feePayer),
      ).size;
      const isActive = sigs.some(
        (s) => s.blockTime && s.blockTime > Date.now() / 1000 - 7776000,
      );
      const deployedAt =
        sigs.length && sigs[sigs.length - 1].blockTime
          ? new Date(sigs[sigs.length - 1].blockTime! * 1000).toISOString()
          : null;
      return { uniqueCallers, isActive, deployedAt };
    } catch (err) {
      this.logger.warn({ programId, err }, 'fetchProgramTraction_fail');
      return { uniqueCallers: 0, isActive: false, deployedAt: null };
    }
  }

  async fetchUpgradeCount(
    programId: string,
    connection: Connection,
  ): Promise<number> {
    try {
      const programPubkey = new PublicKey(programId);
      const [programDataAddress] = PublicKey.findProgramAddressSync(
        [programPubkey.toBuffer()],
        this.BPF_LOADER_UPGRADEABLE,
      );
      const sigs = await connection.getSignaturesForAddress(
        programDataAddress,
        {
          limit: 100,
        },
      );
      return sigs.length;
    } catch (err) {
      this.logger.warn({ programId, err }, 'fetchUpgradeCount_fail');
      return 0;
    }
  }

  async fetchAchievements(walletAddress: string): Promise<Achievement[]> {
    const cacheKey = `solana:achievements:${walletAddress}`;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      // Ignore cache check errors
    }

    const apiKey = this.config.get<string>('HELIUS_API_KEY');
	console.log("HELIUS API KEY:", apiKey);
    if (!apiKey) {
      this.logger.warn('HELIUS_API_KEY is not configured');
      return [];
    }

    try {
      const response = await fetch(
        `https://mainnet.helius-rpc.com/?api-key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 'colosseum-1',
            method: 'getAssetsByOwner',
            params: { ownerAddress: walletAddress, page: 1, limit: 1000 },
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Helius API returned ${response.status}`);
      }

      const data = await response.json();
      const achievements: Achievement[] = [];

      for (const asset of data.result?.items || []) {
        const authority = asset.authorities?.[0]?.address;
        if (!authority) continue;

        const superteamMatch =
          this.achievementWhitelist.matchSuperteam(authority);
        if (superteamMatch) {
          achievements.push({
            type: 'bounty_completion',
            source: 'superteam',
            label: superteamMatch.label,
            year: superteamMatch.year,
          });
        }
      }

      try {
        await this.redis.set(
          cacheKey,
          JSON.stringify(achievements),
          'EX',
          86400,
        ); // 24h
      } catch (e) {
        // Ignore cache setting errors
      }

      return achievements;
    } catch (err) {
      this.logger.warn(
        { walletAddress, err: (err as Error).message },
        'fetchAchievements_fail',
      );
      return [];
    }
  }

  async fetchOnChainData(walletAddress: string) {
	console.log("fetching on chain data ");
    const [deployedPrograms, achievements] = await Promise.all([
      this.fetchProgramsByAuthority(walletAddress),
      this.fetchAchievements(walletAddress),
    ]);
    return {
      ecosystem: 'solana' as const,
      ecosystemPRs: 0,
      deployedPrograms,
      achievements,
    };
  }
}
