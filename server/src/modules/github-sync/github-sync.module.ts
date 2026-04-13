import { Module } from '@nestjs/common';
import { GithubSyncService } from './github-sync.service';
import { GithubSyncController } from './github-sync.controller';
import { GithubSyncController } from './github-sync.controller';

@Module({
  providers: [GithubSyncService],
  controllers: [GithubSyncController]
})
export class GithubSyncModule {}
