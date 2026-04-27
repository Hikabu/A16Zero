import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { JwtAuthGuard } from '../auth-employer/guards/jwt-auth.guard';

@Module({
  controllers: [JobsController],
  providers: [JobsService, JwtAuthGuard],
  exports: [JobsService],
})
export class JobsModule {}
