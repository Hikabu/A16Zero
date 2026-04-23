import { Module } from '@nestjs/common';
import { SignalComputeProcessor } from './signal-compute.processor';
import { EmailProcessor } from './email.processor';
import { GithubSyncProcessor } from './github-sync.processor';
import { PrismaModule } from '../prisma/prisma.module';
import { ScoringModule } from '../scoring/scoring.module';
import { SignalExtractorModule } from '../scoring/signal-extractor/signal-extractor.module';
import { CacheModule } from '../scoring/cache/cache.module';
import { GithubAdapterModule } from '../scoring/github-adapter/github-adapter.module';
import { QueuesModule } from './queues.module';

@Module({
  imports: [
    QueuesModule,
    PrismaModule,
    ScoringModule,
    SignalExtractorModule,
    GithubAdapterModule,
    CacheModule,
  ],
  providers: [SignalComputeProcessor, EmailProcessor, GithubSyncProcessor],
})
export class WorkerModule {}
