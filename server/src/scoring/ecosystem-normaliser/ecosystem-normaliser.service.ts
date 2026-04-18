import { Injectable, Logger } from '@nestjs/common';
import { SignalComputeResult, SignalKey } from '../signal-engine/types';
import { COHORT_BASELINES, DEFAULT_BASELINE } from './cohort-baselines';

export interface EcosystemNormalisationResult {
  assignedCohort: string;
  cohortConfidence: number;
  cohortSize: number;
  normalisedSignals: Record<string, number>;
  uncategorised: boolean;
}

@Injectable()
export class EcosystemNormaliserService {
  private readonly logger = new Logger(EcosystemNormaliserService.name);

  /**
   * Main entry point for ecosystem normalization.
   */
  normalise(result: SignalComputeResult): EcosystemNormalisationResult {
    const { assignedCohort, cohortConfidence, uncategorised } = this.assignCohort(result.languageDistribution);
    
    const baselines = COHORT_BASELINES[assignedCohort] || DEFAULT_BASELINE;
    const normalisedSignals: Record<string, number> = {};

    for (const key in result.signals) {
      const signalKey = key as SignalKey;
      const signal = result.signals[signalKey];
      
      if (signal.excluded || signal.value === null || typeof signal.value !== 'number') {
        normalisedSignals[signalKey] = 0; // Or keep as null/zero
        continue;
      }

      const baseline = baselines[signalKey] || DEFAULT_BASELINE[signalKey];
      if (baseline) {
        // Z-score calculation: (x - μ) / σ
        const zScore = (signal.value - baseline.median) / (baseline.stdDev || 1);
        normalisedSignals[signalKey] = Number(zScore.toFixed(3));
      } else {
        normalisedSignals[signalKey] = 0;
      }
    }

    return {
      assignedCohort,
      cohortConfidence,
      cohortSize: 0, // Placeholder for MVP, would come from DB/Redis in production
      normalisedSignals,
      uncategorised
    };
  }

  private assignCohort(distribution: Record<string, number>): { assignedCohort: string, cohortConfidence: number, uncategorised: boolean } {
    const langs = Object.entries(distribution).sort((a, b) => b[1] - a[1]);
    
    if (langs.length === 0) {
      return { assignedCohort: 'UNCATEGORISED', cohortConfidence: 0, uncategorised: true };
    }

    const [topLang, topPct] = langs[0];

    // Priority Cohort Detection
    // 1. Web3 (Solidity/Vyper >= 30%)
    const web3Pct = (distribution['Solidity'] || 0) + (distribution['Vyper'] || 0);
    if (web3Pct >= 30) {
      return { 
        assignedCohort: 'solidity-web3', 
        cohortConfidence: this.calculateConfidence(topPct, langs.length),
        uncategorised: false 
      };
    }

    // 2. Ruby (>= 80%)
    if (topLang === 'Ruby' && topPct >= 80) return this.result('ruby-rails', topPct, langs.length);
    
    // 3. PHP (>= 80%)
    if (topLang === 'PHP' && topPct >= 80) return this.result('php-web', topPct, langs.length);

    // 4. Standard 70% Thresholds
    if (topLang === 'TypeScript' && topPct >= 70) return this.result('typescript-node', topPct, langs.length);
    if (topLang === 'Python' && topPct >= 70) return this.result('python-ml', topPct, langs.length);
    if (topLang === 'Rust' && topPct >= 70) return this.result('rust-systems', topPct, langs.length);
    if (topLang === 'Java' && topPct >= 70) return this.result('java-spring', topPct, langs.length);
    if (topLang === 'Go' && topPct >= 70) return this.result('go-backend', topPct, langs.length);
    if (topLang === 'C#' && topPct >= 70) return this.result('csharp-dotnet', topPct, langs.length);

    // 5. Secondary "Mixed" Detection (Top lang >= 55% but < 70%)
    if (topPct >= 55) {
        const cohort = this.mapLangToCohort(topLang);
        return { 
            assignedCohort: cohort, 
            cohortConfidence: 0.65, 
            uncategorised: cohort === 'UNCATEGORISED' 
        };
    }

    return { assignedCohort: 'UNCATEGORISED', cohortConfidence: 0.45, uncategorised: true };
  }

  private calculateConfidence(pct: number, langCount: number): number {
    if (pct >= 95 || langCount === 1) return 0.90;
    if (pct >= 55) return 0.65;
    return 0.45;
  }

  private result(cohort: string, pct: number, count: number) {
    return { 
      assignedCohort: cohort, 
      cohortConfidence: this.calculateConfidence(pct, count), 
      uncategorised: false 
    };
  }

  private mapLangToCohort(lang: string): string {
    const map: Record<string, string> = {
      'TypeScript': 'typescript-node',
      'JavaScript': 'typescript-node',
      'Python': 'python-ml',
      'Rust': 'rust-systems',
      'Java': 'java-spring',
      'Go': 'go-backend',
      'Solidity': 'solidity-web3',
      'Ruby': 'ruby-rails',
      'PHP': 'php-web',
      'C#': 'csharp-dotnet'
    };
    return map[lang] || 'UNCATEGORISED';
  }
}
