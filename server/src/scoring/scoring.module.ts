import { Module, Global } from '@nestjs/common';
import { GithubAdapterService } from './github-adapter/github-adapter.service';
import { FirewallService } from './firewall/firewall.service';
import { SignalEngineService } from './signal-engine/signal-engine.service';
import { EcosystemNormaliserService } from './ecosystem-normaliser/ecosystem-normaliser.service';
import { PercentileCalculatorService } from './percentile-calculator/percentile-calculator.service';
import { DataCompletenessEngineService } from './data-completeness-engine/data-completeness-engine.service';
import { ConfidenceEnvelopeService } from './confidence-envelope/confidence-envelope.service';
import { BehaviorClassifierService } from './behavior-classifier/behavior-classifier.service';
import { CareerPhaseEngineService } from './career-phase-engine/career-phase-engine.service';
import { TemporalScoreLayeringService } from './temporal-score-layering/temporal-score-layering.service';
import { PrivacyAdjustmentEngineService } from './privacy-adjustment-engine/privacy-adjustment-engine.service';
import { CapabilityTranslatorService } from './capability-translator/capability-translator.service';
import { DeveloperSnapshotBuilderService } from './developer-snapshot-builder/developer-snapshot-builder.service';
import { CareerTimelineReconstructorService } from './career-timeline-reconstructor/career-timeline-reconstructor.service';
import { ClaimGeneratorService } from './claim-generator/claim-generator.service';

@Global()
@Module({
  providers: [
    GithubAdapterService,
    FirewallService,
    SignalEngineService,
    EcosystemNormaliserService,
    PercentileCalculatorService,
    DataCompletenessEngineService,
    ConfidenceEnvelopeService,
    BehaviorClassifierService,
    CareerPhaseEngineService,
    TemporalScoreLayeringService,
    PrivacyAdjustmentEngineService,
    CapabilityTranslatorService,
    DeveloperSnapshotBuilderService,
    CareerTimelineReconstructorService,
    ClaimGeneratorService,
  ],
  exports: [
    GithubAdapterService,
    FirewallService,
    SignalEngineService,
    EcosystemNormaliserService,
    PercentileCalculatorService,
    DataCompletenessEngineService,
    ConfidenceEnvelopeService,
    BehaviorClassifierService,
    CareerPhaseEngineService,
    TemporalScoreLayeringService,
    PrivacyAdjustmentEngineService,
    CapabilityTranslatorService,
    DeveloperSnapshotBuilderService,
    CareerTimelineReconstructorService,
    ClaimGeneratorService,
  ],
})
export class ScoringModule {}
