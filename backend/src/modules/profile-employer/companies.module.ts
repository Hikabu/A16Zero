import { Module } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { JwtAuthGuard } from '../auth-employer/guards/jwt-auth.guard';

@Module({
  controllers: [CompaniesController],
  providers: [CompaniesService, JwtAuthGuard],
  exports: [CompaniesService],
})
export class CompaniesModule {}
