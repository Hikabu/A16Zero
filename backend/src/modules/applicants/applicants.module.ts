import { Module } from '@nestjs/common';
import { ApplicantsController } from './applicants.controller';
import { JwtAuthGuard } from '../auth-employer/guards/jwt-auth.guard';

@Module({
  controllers: [ApplicantsController],
  providers: [JwtAuthGuard],
})
export class ApplicantsModule {}
