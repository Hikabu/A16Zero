import { Module } from '@nestjs/common';
import { ApplicantsController } from './applicants.controller';

@Module({
  controllers: [ApplicantsController],
})
export class ApplicantsModule {}
