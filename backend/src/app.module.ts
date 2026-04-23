import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { ZodValidationPipeProvider } from './shared/config/zod.config';

import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';

import { GithubSyncModule } from './modules/github-sync/github-sync.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { AtsModule } from './modules/ats/ats.module';
import { FairnessModule } from './modules/fairness/fairness.module';
import { HealthModule } from './modules/health/health.module';
import { QueuesModule } from './queues/queues.module';
import { ScoringModule } from './modules/scoring/scoring.module';
import { EmailModule } from './modules/email/email.module';
import { ScorecardModule } from './modules/scorecard/scorecard.module';
import { ProfileModule } from './modules/profile/profile.module';
import { AuthEmployerModule } from './modules/auth_employer/auth.employer.module';
import { AuthCandidateModule } from './modules/auth-candidate/auth.candidate.module';

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
    AuthEmployerModule,
	AuthCandidateModule,
    HealthModule,
    QueuesModule,
    ScoringModule,
    EmailModule,
    ScorecardModule,
    ProfileModule,
  ],

})
export class AppModule {}