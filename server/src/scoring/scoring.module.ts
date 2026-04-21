import { Module, Global } from '@nestjs/common';
import { GithubAdapterService } from './github-adapter/github-adapter.service';
import { CacheService } from './cache/cache.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { AnalysisController } from './analysis/analysis.controller';
import { BullModule } from '@nestjs/bullmq';
import { ScoringService } from './scoring-service/scoring.service';
import { SignalExtractorService } from './signal-extractor/signal-extractor.service';
import { SummaryGeneratorService } from './summary-generator/summary-generator.service';
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
  imports: [
    PrismaModule, 
    RedisModule,
    BullModule.registerQueue({ name: 'signal-compute' }),
    ConfigModule
  ],
  providers: [
    GithubAdapterService,
    CacheService,
    ScoringService,
    SignalExtractorService,
    SummaryGeneratorService,
  ],
  controllers: [
    AnalysisController,
  ],
  exports: [
    GithubAdapterService,
    CacheService,
    ScoringService,
    BullModule,
  ],
})
export class ScoringModule {}
