import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GithubSyncModule } from './modules/github-sync/github-sync.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { AtsModule } from './modules/ats/ats.module';
import { FairnessModule } from './modules/fairness/fairness.module';
import { RoiModule } from './modules/roi/roi.module';

@Module({
  imports: [GithubSyncModule, JobsModule, AtsModule, FairnessModule, RoiModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
