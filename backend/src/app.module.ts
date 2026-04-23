import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';

import { GithubSyncModule } from './modules/github-sync/github-sync.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { QueuesModule } from './queues/queues.module';
import { ScoringModule } from './modules/scoring/scoring.module';
import { EmailModule } from './modules/email/email.module';
import { ScorecardModule } from './modules/scorecard/scorecard.module';
import { VouchersModule } from './modules/vouchers/vouchers.module';

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
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
        transport:
          process.env.NODE_ENV !== 'production'
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
    AuthModule,
    HealthModule,
    QueuesModule,
    ScoringModule,
    EmailModule,
    ScorecardModule,
    VouchersModule,
    // ...(process.env.RUN_WORKERS === 'true' ? [WorkerModule] : []),
  ],
})
export class AppModule {}
