import { Injectable } from '@nestjs/common';
import { SignalComputeResult, SignalValue } from '../signal-engine/types';
import { BehaviorClassificationResult, BehaviorPattern } from './types';

@Injectable()
export class BehaviorClassifierService {
  private readonly HR_METADATA: Record<BehaviorPattern, { label: string; description: string }> = {
    [BehaviorPattern.REVIEW_HEAVY_SENIOR]: {
      label: 'Senior/Staff pattern',
      description: 'Leads through review and architecture rather than volume coding',
    },
    [BehaviorPattern.COMMIT_HEAVY_MIDLEVEL]: {
      label: 'Mid-level pattern',
      description: 'Reliable individual contributor, collaborative, delivery-focused',
    },
    [BehaviorPattern.BALANCED_CONTRIBUTOR]: {
      label: 'Well-rounded contributor',
      description: 'Both builds and reviews at consistent level',
    },
    [BehaviorPattern.OSS_COLLABORATOR]: {
      label: 'Open-source specialist',
      description: 'Cross-ecosystem contributor, strong community presence',
    },
    [BehaviorPattern.EARLY_CAREER]: {
      label: 'Emerging developer',
      description: 'Strong growth signals; evaluate for growth potential over track record',
    },
    [BehaviorPattern.RETURNING_DEVELOPER]: {
      label: 'Returning developer',
      description: 'Prior strong track record; recent activity resuming after gap',
    },
    [BehaviorPattern.WEB3_SPECIALIST]: {
      label: 'Web3-native developer',
      description: 'Smart contract experience with verified on-chain presence',
    },
  };

  private readonly ACCURACY_DISCLOSURE =
    'Pattern classification is Rule-based and hypothesis-generating. Treat as a starting point for interviewer investigation, not a concluded assessment.';

  /**
   * Classifies user behavior based on signal engine results.
   */
  compute(
    signalRes: SignalComputeResult,
    accountAgeMonths: number,
    careerPhase?: { careerGapDetected: boolean; historicalStrength: number },
  ): BehaviorClassificationResult {
    const signals = signalRes.signals;
    const patterns: { pattern: BehaviorPattern; confidence: number }[] = [];

    // 1. EARLY_CAREER (Priority 1) - Can skip all others if matched
    const activeMonths = this.val(signals['activeMonths']);
    const externalRatio = this.val(signals['externalPrRatio']);

    if (accountAgeMonths < 18 || activeMonths < 6) {
      const both = accountAgeMonths < 18 && activeMonths < 6;
      const primary = { pattern: BehaviorPattern.EARLY_CAREER, confidence: both ? 0.85 : 0.7 };
      return this.buildResult(primary, null);
    }

    // 2. RETURNING_DEVELOPER
    if (careerPhase?.careerGapDetected && careerPhase.historicalStrength >= 65) {
      if (signals['seniorityTrajectory']?.value === 'RETURNING') {
        patterns.push({ pattern: BehaviorPattern.RETURNING_DEVELOPER, confidence: 0.75 });
      }
    }

    // 3. REVIEW_HEAVY_SENIOR
    const reviewDepth = this.val(signals['reviewDepth']);
    const prReviewCount = this.val(signals['prReviewCount12m']);
    const activeWeeksRatio = this.val(signals['activeWeeksRatio']);
    const avgWeeklyCommits = this.val(signals['avgWeeklyCommits']);
    
    const reviewToCommitRatio = prReviewCount / (activeWeeksRatio * 52 * avgWeeklyCommits + 0.001);

    if (reviewDepth >= 0.7 && reviewToCommitRatio >= 0.4) {
      let conf = 0.72;
      if (reviewDepth > 0.85) conf = 0.85;
      patterns.push({ pattern: BehaviorPattern.REVIEW_HEAVY_SENIOR, confidence: conf });
    }

    // 4. OSS_COLLABORATOR
    const prestige = this.val(signals['highPrestigeRepoContributions']);
    const prestigeExcluded = signals['highPrestigeRepoContributions']?.excluded;
    if (externalRatio >= 0.5 && prestige >= 1 && !prestigeExcluded && prReviewCount >= 10) {
      patterns.push({ pattern: BehaviorPattern.OSS_COLLABORATOR, confidence: 0.8 });
    }

    // 5. COMMIT_HEAVY_MIDLEVEL
    const consistency = this.val(signals['commitConsistencyScore']);
    if (consistency >= 0.65 && reviewDepth < 0.5 && externalRatio >= 0.2) {
      patterns.push({ pattern: BehaviorPattern.COMMIT_HEAVY_MIDLEVEL, confidence: 0.72 });
    }

    // 6. BALANCED_CONTRIBUTOR (Fallback check)
    if (consistency >= 0.4 && reviewDepth >= 0.3 && externalRatio >= 0.1) {
      patterns.push({ pattern: BehaviorPattern.BALANCED_CONTRIBUTOR, confidence: 0.65 });
    }

    // Determine Primary
    let primary: { pattern: BehaviorPattern; confidence: number };
    if (patterns.length > 0) {
      // Priority based on matching order in spec
      primary = patterns[0];
    } else {
      // Ultimate Default
      primary = { pattern: BehaviorPattern.COMMIT_HEAVY_MIDLEVEL, confidence: 0.45 };
    }

    // Determine Secondary
    const remaining = patterns
      .filter((p) => p.pattern !== primary.pattern && p.confidence >= 0.5)
      .sort((a, b) => b.confidence - a.confidence);
    const secondary = remaining.length > 0 ? remaining[0].pattern : null;

    return this.buildResult(primary, secondary);
  }

  private val(signal?: SignalValue): number {
    if (!signal || signal.excluded || signal.value === null) return 0;
    return Number(signal.value);
  }

  private buildResult(primary: { pattern: BehaviorPattern; confidence: number }, secondary: BehaviorPattern | null): BehaviorClassificationResult {
    const meta = this.HR_METADATA[primary.pattern];
    return {
      primaryPattern: primary.pattern,
      primaryConfidence: primary.confidence,
      secondaryPattern: secondary,
      hrLabel: meta.label,
      hrDescription: meta.description,
      accuracyDisclosure: this.ACCURACY_DISCLOSURE,
    };
  }
}
