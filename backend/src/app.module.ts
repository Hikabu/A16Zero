import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CompaniesModule } from './companies/companies.module';
import { JobsModule } from './jobs/jobs.module';
import { CandidatesModule } from './candidates/candidates.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import * as zod from 'zod';

const envSchema = zod.object({
  DATABASE_URL: zod.string().url(),
  JWT_SECRET: zod.string().min(32),
  PRIVY_APP_ID: zod.string(),
  PRIVY_JWKS_URL: zod.string().url().optional(),
  PORT: zod.string().default('3000'),
  NODE_ENV: zod.enum(['development', 'production', 'test']).default('development'),
});

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => {
        return envSchema.parse(config);
      },
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    PrismaModule,
    AuthModule,
    CompaniesModule,
    JobsModule,
    CandidatesModule,
    AnalyticsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
