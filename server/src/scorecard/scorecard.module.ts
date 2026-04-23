import { Module } from '@nestjs/common';
import { ScorecardService } from './scorecard.service';
import { ScorecardController } from './scorecard.controller';
import { MockController } from './mock/mock.controller';
import { ScoringModule } from '../scoring/scoring.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ScoringModule, ConfigModule, PrismaModule],
  providers: [ScorecardService],
  controllers: [ScorecardController, MockController],
  exports: [ScorecardService],
})
export class ScorecardModule {}

