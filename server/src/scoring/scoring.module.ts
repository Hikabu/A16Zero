import { Module, Global } from '@nestjs/common';
import { GithubAdapterService } from './github-adapter/github-adapter.service';
import { FirewallService } from './firewall/firewall.service';
import { SignalEngineService } from './signal-engine/signal-engine.service';
import { EcosystemNormaliserService } from './ecosystem-normaliser/ecosystem-normaliser.service';
import { PercentileCalculatorService } from './percentile-calculator/percentile-calculator.service';

@Global()
@Module({
  providers: [
    GithubAdapterService,
    FirewallService,
    SignalEngineService,
    EcosystemNormaliserService,
    PercentileCalculatorService,
  ],
  exports: [
    GithubAdapterService,
    FirewallService,
    SignalEngineService,
    EcosystemNormaliserService,
    PercentileCalculatorService,
  ],
})
export class ScoringModule {}
