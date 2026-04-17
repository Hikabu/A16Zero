import { Module, Global } from '@nestjs/common';
import { GithubAdapterService } from './github-adapter/github-adapter.service';
import { FirewallService } from './firewall/firewall.service';
import { SignalEngineService } from './signal-engine/signal-engine.service';

@Global()
@Module({
  providers: [GithubAdapterService, FirewallService, SignalEngineService],
  exports: [GithubAdapterService, FirewallService, SignalEngineService],
})
export class ScoringModule {}
