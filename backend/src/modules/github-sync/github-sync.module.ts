import { Module } from '@nestjs/common';
import { GithubSyncService } from './github-sync.service';
import { GithubSyncController } from './github-sync.controller';
import { ProfileResolverModule } from '../profile-candidate/profile-resolver.module';

@Module({
	imports: [ProfileResolverModule],
  providers: [GithubSyncService],
  controllers: [GithubSyncController],
})
export class GithubSyncModule {}
