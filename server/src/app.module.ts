import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { ZodValidationPipeProvider } from './common/configs/zod.config';

import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';

import { GithubSyncModule } from './modules/github-sync/github-sync.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { AtsModule } from './modules/ats/ats.module';
import { FairnessModule } from './modules/fairness/fairness.module';
import { RoiModule } from './modules/roi/roi.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { QueuesModule } from './queues/queues.module';
import { WorkerModule } from './queues/worker.module';
import { ScoringModule } from './scoring/scoring.module';
import { EmailModule } from './modules/email/email.module';
import { ScorecardModule } from './scorecard/scorecard.module';

@Module({
  providers: [
  {
    provide: APP_GUARD,
    useClass: ThrottlerGuard,
  },
  ZodValidationPipeProvider,
],
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 10,
        },
      ],
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport: process.env.NODE_ENV !== 'production'
          ? {
              target: 'pino-pretty',
              options: { singleLine: true },
            }
          : undefined,
      },
    }),
    PrismaModule,
    RedisModule,
    GithubSyncModule, 
    JobsModule, 
    AtsModule, 
    FairnessModule, 
    RoiModule,
    AuthModule,
    HealthModule,
    QueuesModule,
    ScoringModule,
    EmailModule,
    ScorecardModule,
    // ...(process.env.RUN_WORKERS === 'true' ? [WorkerModule] : []),
  ],

})
export class AppModule {}
