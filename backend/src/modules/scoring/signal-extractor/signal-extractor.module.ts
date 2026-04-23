import { Module } from '@nestjs/common';
import { SignalExtractorService } from './signal-extractor.service';

@Module({
  providers: [SignalExtractorService],
  exports: [SignalExtractorService],
})
export class SignalExtractorModule {}
