import { Injectable } from '@nestjs/common';
import { SignalComputeResult, PillarKey } from '../signal-engine/types';
import { DataCompletenessResult, VisibilityTier } from './types';

@Injectable()
export class DataCompletenessEngineService {
  /**
   * Assesses data completeness and rebalances pillar weights if necessary.
   */
  compute(
    signalResult: SignalComputeResult,
    baseWeights: Record<PillarKey, number>,
  ): DataCompletenessResult {
    const totalSignals = Object.keys(signalResult.signals).length;
    
    // Count evaluable signals (those not excluded)
    const evaluableSignals = Object.values(signalResult.signals).filter(
      (s) => !s.excluded,
    ).length;

    const dataCoveragePercent = totalSignals > 0 
      ? (evaluableSignals / totalSignals) * 100 
      : 0;

    // Determine Visibility Tier
    let visibilityTier: VisibilityTier = 'MINIMAL';
    if (dataCoveragePercent >= 80) {
      visibilityTier = 'FULL';
    } else if (dataCoveragePercent >= 50) {
      visibilityTier = 'PARTIAL';
    } else if (dataCoveragePercent >= 25) {
      visibilityTier = 'LOW';
    }

    // Determine Pillar Evaluability
    // A pillar is evaluable if it has at least 1 non-excluded signal.
    const pillarEvaluability: Record<PillarKey, boolean> = {
      ACTIVITY: false,
      COLLABORATION: false,
      QUALITY: false,
      RELIABILITY: false,
      IMPACT: false,
      GROWTH: false,
    };

    const pillarKeys = Object.keys(pillarEvaluability) as PillarKey[];
    pillarKeys.forEach((pillar) => {
      const signalsInPillar = signalResult.pillarSignals[pillar] || [];
      const hasActiveSignal = signalsInPillar.some(
        (key) => !signalResult.signals[key]?.excluded,
      );
      pillarEvaluability[pillar] = hasActiveSignal;
    });

    // Rebalance Weights for PARTIAL and LOW tiers
    let rebalancedWeights: Record<PillarKey, number> = { ...baseWeights };
    let completenessNote: string | null = null;

    if (visibilityTier === 'PARTIAL' || visibilityTier === 'LOW') {
      rebalancedWeights = this.rebalanceWeights(baseWeights, pillarEvaluability);
      
      const excludedPillarsCount = pillarKeys.filter(p => !pillarEvaluability[p]).length;
      if (excludedPillarsCount > 0) {
        if (visibilityTier === 'LOW') {
          completenessNote = 'Significant data gaps detected — scoring reflects available public signals only. This developer may work primarily in private repositories.';
        } else {
          completenessNote = 'Some data gaps detected — weights adjusted to reflect evaluable pillars.';
        }
      }
    }

    // Hard Gates
    const scoreWithheld = dataCoveragePercent < 40;
    const overallConfidenceCap = visibilityTier === 'MINIMAL' ? 0.45 : null;

    return {
      dataCoveragePercent,
      visibilityTier,
      rebalancedWeights,
      scoreWithheld,
      completenessNote,
      pillarEvaluability,
      overallConfidenceCap,
    };
  }

  /**
   * Redistributes weights from non-evaluable pillars proportionally across evaluable pillars.
   */
  private rebalanceWeights(
    baseWeights: Record<PillarKey, number>,
    pillarEvaluability: Record<PillarKey, boolean>,
  ): Record<PillarKey, number> {
    const pillarKeys = Object.keys(baseWeights) as PillarKey[];
    
    // 1. Identify excluded pillars
    const excludedPillars = pillarKeys.filter((p) => !pillarEvaluability[p]);
    const includedPillars = pillarKeys.filter((p) => pillarEvaluability[p]);

    // If no pillars are evaluable, return base weights (shouldn't happen with MINIMAL tier logic but for safety)
    if (includedPillars.length === 0) {
      return { ...baseWeights };
    }

    // 2. Sum the base weights of excluded pillars
    let removedWeight = 0;
    excludedPillars.forEach((p) => {
      removedWeight += baseWeights[p];
    });

    // 3. Distribute removedWeight across included pillars proportionally to their original base weights
    const newWeights: Record<PillarKey, number> = {
      ACTIVITY: 0,
      COLLABORATION: 0,
      QUALITY: 0,
      RELIABILITY: 0,
      IMPACT: 0,
      GROWTH: 0,
    };

    const includedBaseWeightTotal = includedPillars.reduce(
      (sum, p) => sum + baseWeights[p],
      0,
    );

    includedPillars.forEach((p) => {
      if (includedBaseWeightTotal > 0) {
        const proportion = baseWeights[p] / includedBaseWeightTotal;
        newWeights[p] = baseWeights[p] + removedWeight * proportion;
      } else {
        // If all included pillars had 0 weight, distribute equally
        newWeights[p] = removedWeight / includedPillars.length;
      }
    });

    // 4. Verify sum is 1.0 (epsilon adjustment)
    const currentSum = Object.values(newWeights).reduce((a, b) => a + b, 0);
    const epsilon = 1.0 - currentSum;

    if (Math.abs(epsilon) > 0.0001) {
      // Find the highest weight pillar to adjust
      let highestPillar = includedPillars[0];
      includedPillars.forEach((p) => {
        if (newWeights[p] > newWeights[highestPillar]) {
          highestPillar = p;
        }
      });
      newWeights[highestPillar] += epsilon;
    }

    // Round to 4 decimal places for cleanliness, then ensure total sum is exactly 1.0
    // Actually, let's keep it precise and let the epsilon adjustment handle it.
    
    return newWeights;
  }
}
