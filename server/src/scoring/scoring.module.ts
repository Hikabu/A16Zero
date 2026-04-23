import { Module, Global } from '@nestjs/common';
import { GithubAdapterService } from './github-adapter/github-adapter.service';
import { CacheService } from './cache/cache.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { AnalysisController } from './analysis/analysis.controller';
import { BullModule } from '@nestjs/bullmq';
import { ScoringService } from './scoring-service/scoring.service';
import { SignalExtractorService } from './signal-extractor/signal-extractor.service';
import { EcosystemClassifierService } from './signal-extractor/ecosystem-clarifier.service';
import { StackFingerprintService } from './signal-extractor/stack-fingerprint.service';
import { SummaryGeneratorService } from './summary-generator/summary-generator.service';
import { SolanaAdapterService } from './web3-adapter/solana-adapter.service';
import { Web3MergeService } from './web3-merge/web3-merge.service';
import { AchievementWhitelistService } from './web3-adapter/achievement-whitelist.service';

@Global()
@Module({
  imports: [
    PrismaModule,
    RedisModule,
    BullModule.registerQueue({ name: 'signal-compute' }),
  ],
  providers: [
    GithubAdapterService,
    CacheService,
    ScoringService,
    SignalExtractorService,
    EcosystemClassifierService,
    StackFingerprintService,
    SummaryGeneratorService,
    SolanaAdapterService,
    Web3MergeService,
    AchievementWhitelistService,
  ],
  controllers: [AnalysisController],
  exports: [
    GithubAdapterService,
    CacheService,
    ScoringService,
    SolanaAdapterService,
    Web3MergeService,
    BullModule,
  ],
})
export class ScoringModule {}
