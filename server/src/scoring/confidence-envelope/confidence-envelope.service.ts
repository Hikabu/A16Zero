import { Injectable } from '@nestjs/common';
import { ConfidenceTier, RiskLevel } from '@prisma/client';
import { PillarKey } from '../signal-engine/types';
import { FraudTier } from '../firewall/types';
import { ConfidenceEnvelope, ConfidenceEnvelopeInput, ConfidenceCaveat } from './types';

@Injectable()
export class ConfidenceEnvelopeService {
  /**
   * Builds the confidence envelope based on data coverage, fraud tiers, and signal quality.
   */
  buildEnvelope(input: ConfidenceEnvelopeInput): ConfidenceEnvelope {
    const caveats: ConfidenceCaveat[] = [];
    let currentConfidence = 1.0;

    // Step 1: Base confidence from data coverage
    if (input.dataCoveragePercent >= 80) {
      currentConfidence = 0.90;
    } else if (input.dataCoveragePercent >= 50) {
      currentConfidence = 0.72;
    } else if (input.dataCoveragePercent >= 25) {
      currentConfidence = 0.50;
    } else {
      currentConfidence = 0.35;
    }

    // Step 2: Apply fraud penalty
    if (input.fraudTier === FraudTier.SUSPICIOUS) {
      currentConfidence *= 0.80;
    } else if (input.fraudTier === FraudTier.LIKELY_FRAUDULENT) {
      currentConfidence *= 0.50;
      caveats.push({
        signalKey: 'fraudDetection',
        hrReadable: 'Unusual activity patterns detected — recommend manual verification',
        severity: 'WARNING',
      });
    }

    // Step 3: Apply cap from DataCompletenessEngine
    if (input.overallConfidenceCap !== null) {
      currentConfidence = Math.min(currentConfidence, input.overallConfidenceCap);
    }

    // Step 4: Apply consistency notes penalty
    input.consistencyNotes.forEach((note) => {
      currentConfidence *= 0.90;
      caveats.push({
        signalKey: 'consistencyCheck',
        hrReadable: note,
        severity: 'INFO',
      });
    });

    // Step 5: Add excluded signal caveats
    input.excludedSignals.forEach((excluded) => {
      caveats.push({
        signalKey: excluded.key,
        hrReadable: `Insufficient ${excluded.key} history to assess (${excluded.sampleSize} of ${excluded.minimumRequired} minimum)`,
        severity: 'INFO',
      });
    });

    // Step 6: Add private work note
    if (input.privateWorkNote) {
      caveats.push({
        signalKey: 'privateWork',
        hrReadable: input.privateWorkNote,
        severity: 'INFO',
      });
    }

    // Ensure confidence doesn't exceed 1.0 or drop below 0.0
    currentConfidence = Math.max(0, Math.min(1.0, currentConfidence));

    // Step 7: Map to ConfidenceTier and RiskLevel
    let confidenceTier: ConfidenceTier = ConfidenceTier.MINIMAL;
    let riskLevel: RiskLevel = RiskLevel.INSUFFICIENT_DATA;
    let hrLabel = 'Insufficient data';
    let hrGuidance = 'Score withheld. Insufficient public data — not a quality signal.';

    if (currentConfidence >= 0.80) {
      confidenceTier = ConfidenceTier.FULL;
      riskLevel = RiskLevel.LOW_RISK;
      hrLabel = 'High confidence';
      hrGuidance = 'Proceed on scorecard. Evidence is sufficient for confident decision.';
    } else if (currentConfidence >= 0.55) {
      confidenceTier = ConfidenceTier.PARTIAL;
      riskLevel = RiskLevel.MEDIUM_RISK;
      hrLabel = 'Moderate confidence';
      hrGuidance = 'Proceed with awareness. Score is directionally reliable. Flag gaps for interview.';
    } else if (currentConfidence >= 0.35) {
      confidenceTier = ConfidenceTier.LOW;
      riskLevel = RiskLevel.HIGH_RISK;
      hrLabel = 'Low confidence';
      hrGuidance = 'Review before advancing. Significant data gaps detected. Weight interview heavily.';
    }

    const scoreWithheld = input.dataCoveragePercent < 40 || confidenceTier === ConfidenceTier.MINIMAL;

    return {
      overallConfidence: Number(currentConfidence.toFixed(4)),
      confidenceTier,
      riskLevel,
      hrLabel,
      hrGuidance,
      caveats,
      scoreWithheld,
    };
  }

  /**
   * Enforces signal dominance cap by clamping any single pillar to a maximum of 0.40.
   * Excess is redistributed proportionally to other pillars.
   */
  enforceSignalDominanceCap(pillarWeights: Record<PillarKey, number>): Record<PillarKey, number> {
    const weights = { ...pillarWeights };
    const pillars = Object.keys(weights) as PillarKey[];
    const CAP = 0.40;

    let totalExcess = 0;
    const cappedPillars: PillarKey[] = [];
    const availablePillars: PillarKey[] = [];

    pillars.forEach((p) => {
      if (weights[p] > CAP) {
        totalExcess += weights[p] - CAP;
        weights[p] = CAP;
        cappedPillars.push(p);
      } else if (weights[p] > 0) {
        availablePillars.push(p);
      }
    });

    if (totalExcess <= 0 || availablePillars.length === 0) {
      return weights;
    }

    // Redistribute excess proportionally
    const availableBaseWeightTotal = availablePillars.reduce((sum, p) => sum + weights[p], 0);

    availablePillars.forEach((p) => {
      if (availableBaseWeightTotal > 0) {
        const proportion = weights[p] / availableBaseWeightTotal;
        weights[p] += totalExcess * proportion;
      } else {
        // Fallback: distribute equally if all available pillars are 0
        weights[p] += totalExcess / availablePillars.length;
      }
    });

    // Verify sum is 1.0 (epsilon adjustment)
    const currentSum = Object.values(weights).reduce((a, b) => a + b, 0);
    const epsilon = 1.0 - currentSum;
    if (Math.abs(epsilon) > 0.0001) {
      // Adjust the highest weighted pillar among those not already capped if possible
      const targetPillar = availablePillars.length > 0 ? availablePillars[0] : pillars[0];
      weights[targetPillar] += epsilon;
    }

    return weights;
  }
}
