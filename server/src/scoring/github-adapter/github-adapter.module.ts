import { Module } from '@nestjs/common';
import { GithubAdapterService } from './github-adapter.service';

@Module({
    providers: [GithubAdapterService],
    exports: [GithubAdapterService]
})

export class GithubAdapterModule {}