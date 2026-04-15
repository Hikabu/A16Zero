import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';

import { GithubSyncModule } from './modules/github-sync/github-sync.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { AtsModule } from './modules/ats/ats.module';
import { FairnessModule } from './modules/fairness/fairness.module';
import { RoiModule } from './modules/roi/roi.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';

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
    
  ],

})
export class AppModule {}
