import { Module } from '@nestjs/common';
import { ScorecardService } from './scorecard.service';
import { ScorecardController } from './scorecard.controller';
import { ScoringModule } from '../scoring/scoring.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [ScoringModule, ConfigModule, PrismaModule],
  providers: [ScorecardService],
  controllers: [ScorecardController],
  exports: [ScorecardService],
})
export class ScorecardModule {}
