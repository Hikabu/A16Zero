import { Injectable } from '@nestjs/common';
import { SignalComputeResult, SignalKey } from '../signal-engine/types';
import { BehaviorClassificationResult } from '../behavior-classifier/types';
import { ConfidenceEnvelope } from '../confidence-envelope/types';
import { CapabilityStatement, GapStatement, CapabilityTranslationResult } from './types';

@Injectable()
export class CapabilityTranslatorService {
  /**
   * Translates signals and behavior into HR-readable capability and gap statements.
   */
  translate(
    signalResult: SignalComputeResult,
    behaviorResult: BehaviorClassificationResult,
    confidenceEnvelope: ConfidenceEnvelope,
  ): CapabilityTranslationResult {
    const capabilityStatements: CapabilityStatement[] = [];
    const gapStatements: GapStatement[] = [];

    const signals = signalResult.signals;

    // 1. activeWeeksRatio > 0.7
    if (this.val(signals.activeWeeksRatio) > 0.7) {
      capabilityStatements.push({
        key: 'consistentActivity',
        text: 'Demonstrates consistent coding activity over the past year',
        confidence: signals.activeWeeksRatio.confidence,
        supportingSignals: ['activeWeeksRatio'],
      });
    }

    // 2. reviewDepth > 0.7 + prReviewCount12m > 20
    if (this.val(signals.reviewDepth) > 0.7 && this.val(signals.prReviewCount12m) > 20) {
      capabilityStatements.push({
        key: 'strongCodeReview',
        text: 'Strong code review practice — provides substantive technical feedback',
        confidence: Math.min(signals.reviewDepth.confidence, signals.prReviewCount12m.confidence),
        supportingSignals: ['reviewDepth', 'prReviewCount12m'],
      });
    }

    // 3. testFilePresence > 0.7
    if (this.val(signals.testFilePresence) > 0.7) {
      capabilityStatements.push({
        key: 'testingDiscipline',
        text: 'Maintains testing discipline across projects',
        confidence: signals.testFilePresence.confidence,
        supportingSignals: ['testFilePresence'],
      });
    }

    // 4. cicdConfigDetection true
    if (signals.cicdConfigDetection?.value === true) {
      capabilityStatements.push({
        key: 'cicdExperience',
        text: 'Uses automated CI/CD pipelines',
        confidence: signals.cicdConfigDetection.confidence,
        supportingSignals: ['cicdConfigDetection'],
      });
    }

    // 5. externalPrRatio > 0.3
    if (this.val(signals.externalPrRatio) > 0.3) {
      capabilityStatements.push({
        key: 'ossContributor',
        text: 'Active open-source contributor — collaborates beyond own projects',
        confidence: signals.externalPrRatio.confidence,
        supportingSignals: ['externalPrRatio'],
      });
    }

    // 6. highPrestigeRepoContributions true
    if (signals.highPrestigeRepoContributions?.value === true) {
      capabilityStatements.push({
        key: 'prestigeContrib',
        text: 'Contributed to high-profile open-source projects',
        confidence: signals.highPrestigeRepoContributions.confidence,
        supportingSignals: ['highPrestigeRepoContributions'],
      });
    }

    // 7. prAcceptanceRate > 0.8 (not excluded)
    if (!signals.prAcceptanceRate?.excluded && this.val(signals.prAcceptanceRate) > 0.8) {
      capabilityStatements.push({
        key: 'highAcceptance',
        text: 'High code acceptance rate — produces work that meets reviewer standards',
        confidence: signals.prAcceptanceRate.confidence,
        supportingSignals: ['prAcceptanceRate'],
      });
    }

    // 8. newLanguagesAdopted1yr >= 2
    const newLangs = this.val(signals.newLanguagesAdopted1yr);
    if (typeof newLangs === 'number' && newLangs >= 2) {
      capabilityStatements.push({
        key: 'techAdaptability',
        text: `Actively expanding technical stack — adopted ${newLangs} new languages in the past year`,
        confidence: signals.newLanguagesAdopted1yr.confidence,
        supportingSignals: ['newLanguagesAdopted1yr'],
      });
    }

    // 9. privateOrgActivity true
    if (signals.privateOrgActivity?.value === true) {
      capabilityStatements.push({
        key: 'enterpriseExperience',
        text: 'Evidence of active private/enterprise work',
        confidence: signals.privateOrgActivity.confidence,
        supportingSignals: ['privateOrgActivity'],
      });
    }

    // 10. commitConsistencyScore > 0.75
    if (this.val(signals.commitConsistencyScore) > 0.75) {
      capabilityStatements.push({
        key: 'reliableDelivery',
        text: 'Highly reliable delivery cadence',
        confidence: signals.commitConsistencyScore.confidence,
        supportingSignals: ['commitConsistencyScore'],
      });
    }

    // Gap Statements (Basic Logic for MVP)
    if (confidenceEnvelope.overallConfidence < 0.4) {
      gapStatements.push({
        key: 'dataScarcity',
        text: 'Significant signal gaps — public data may not reflect full capability',
        severity: 'SIGNIFICANT',
      });
    }

    return { capabilityStatements, gapStatements };
  }

  private val(signal: any): any {
    return signal?.value || 0;
  }
}
