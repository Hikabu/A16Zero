import { Module } from '@nestjs/common';
import { GithubSyncService } from './github-sync.service';
import { GithubSyncController } from './github-sync.controller';
import { GithubSyncProcessor } from '../../queues/github-sync.processor';

@Module({
  providers: [GithubSyncService],
  controllers: [GithubSyncController],
})
export class GithubSyncModule {}
