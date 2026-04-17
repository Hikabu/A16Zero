import { Module, Global } from '@nestjs/common';
import { GithubAdapterService } from './github-adapter/github-adapter.service';

@Global()
@Module({
  providers: [GithubAdapterService],
  exports: [GithubAdapterService],
})
export class ScoringModule {}
