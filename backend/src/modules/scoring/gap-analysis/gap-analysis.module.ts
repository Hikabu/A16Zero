import { Module } from '@nestjs/common';
import { GapAnalysisService } from './gap-analysis.service';

@Module({
  providers: [GapAnalysisService],
  exports: [GapAnalysisService],
})
export class GapAnalysisModule {}
