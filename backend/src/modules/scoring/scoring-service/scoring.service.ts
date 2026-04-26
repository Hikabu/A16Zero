import { Injectable } from '@nestjs/common';
import { GitHubRawData, GitHubRepo } from '../github-adapter/github-data.types';
import { EcosystemClassifierService } from '../signal-extractor/ecosystem-clarifier.service';
import { StackFingerprintService } from '../signal-extractor/stack-fingerprint.service';
import {
  ExtractedSignals,
  AnalysisResult,
  ConfidenceLevel,
  ConsistencyLevel,
} from '../types/result.types';
import { SignalExtractorService } from '../signal-extractor/signal-extractor.service';
import { SummaryGeneratorService } from '../summary-generator/summary-generator.service';
import { LANGUAGE_CAPABILITY_WEIGHTS } from './language-weights';

@Injectable()
export class ScoringService {
  constructor(
    private readonly signalExtractor: SignalExtractorService,
    private readonly summaryGenerator: SummaryGeneratorService,
    private readonly ecosystemClassifier: EcosystemClassifierService,
    private readonly stackFingerprint: StackFingerprintService,
  ) {}

  /**
   * Main entry point to score a developer.
   */
  score(data: GitHubRawData, walletAddress?: string | null): AnalysisResult {
    const signals = this.signalExtractor.extract(data);

    const capabilities = this.computeCapabilities(signals);
    const ownership = this.computeOwnership(data);
    const impact = this.computeImpact(signals, data);

    const s9Ecosystem = this.ecosystemClassifier.detectEcosystemIdentity(
      data.repos,
    );
    const s10EcosystemPRs = this.ecosystemClassifier.countEcosystemPRs(
      data.externalPRs?.externalRepoNames?.map((repo) => ({ repo })) || [],
    );

    const { tools } = this.stackFingerprint.extract(
      data.manifestKeys,
      signals.stackIdentity,
    );

    impact.externalContributions += s10EcosystemPRs;

    const result: AnalysisResult = {
      summary: '',
      capabilities,
      ownership,
      impact,
      stack: { languages: signals.stackIdentity, tools },
      reputation: null,
      web3: null,
    };

    if (s9Ecosystem || walletAddress) {
      result.web3 = {
        ecosystem: s9Ecosystem,
        ecosystemPRs: s10EcosystemPRs,
        deployedPrograms: [], // stub
        achievements: [], // stub
      };
    }

    // Add private work note if applicable
    if (this.signalExtractor.detectPrivateWorkIndicators(signals)) {
      result.privateWorkNote =
        'This profile shows high activity but low public artifact density, which typically indicates significant work in private repositories.';
    }

    // Add private work note if applicable
    if (this.signalExtractor.detectPrivateWorkIndicators(signals)) {
      result.privateWorkNote =
        'This profile shows high activity but low public artifact density, which typically indicates significant work in private repositories.';
    }

    // Generate summary
    result.summary = this.summaryGenerator.generate(result);

    return result;
  }

  /**
   * Computes capability scores (Backend, Frontend, DevOps).
   */
  private computeCapabilities(
    signals: ExtractedSignals,
  ): AnalysisResult['capabilities'] {
    const { stackIdentity, techStackBreadth, dataCompleteness } = signals;

    const scores = { backend: 0, frontend: 0, devops: 0 };

    if (stackIdentity.length === 0) {
      const fallback = LANGUAGE_CAPABILITY_WEIGHTS['_unknown'];
      scores.backend = fallback.backend;
      scores.frontend = fallback.frontend;
      scores.devops = fallback.devops;
    } else {
      // Weight 1: Primary language (70%)
      const primaryLang = stackIdentity[0];
      const primaryWeights =
        LANGUAGE_CAPABILITY_WEIGHTS[primaryLang] ||
        LANGUAGE_CAPABILITY_WEIGHTS['_unknown'];

      scores.backend += primaryWeights.backend * 0.7;
      scores.frontend += primaryWeights.frontend * 0.7;
      scores.devops += primaryWeights.devops * 0.7;

      // Weight 2: Secondary language (30%)
      const secondaryLang = stackIdentity[1];
      if (secondaryLang) {
        const secondaryWeights =
          LANGUAGE_CAPABILITY_WEIGHTS[secondaryLang] ||
          LANGUAGE_CAPABILITY_WEIGHTS['_unknown'];
        scores.backend += secondaryWeights.backend * 0.3;
        scores.frontend += secondaryWeights.frontend * 0.3;
        scores.devops += secondaryWeights.devops * 0.3;
      } else {
        // If only one language, it gets the full weight
        scores.backend += primaryWeights.backend * 0.3;
        scores.frontend += primaryWeights.frontend * 0.3;
        scores.devops += primaryWeights.devops * 0.3;
      }
    }

    // Breadth Bonus: +0.03 per language, capped at +0.15
    const breadthBonus = Math.min(techStackBreadth * 0.03, 0.15);
    scores.backend += breadthBonus;
    scores.frontend += breadthBonus;
    scores.devops += breadthBonus;

    // Confidence Mapping from S8
    let confidence: ConfidenceLevel = 'low';
    if (dataCompleteness > 0.7) confidence = 'high';
    else if (dataCompleteness > 0.3) confidence = 'medium';

    // Normalise and Round
    const round = (val: number) => Math.round(Math.min(val, 1.0) * 100) / 100;

    return {
      backend: { score: round(scores.backend), confidence },
      frontend: { score: round(scores.frontend), confidence },
      devops: { score: round(scores.devops), confidence },
    };
  }

  /**
   * Computes ownership metrics.
   */
  private computeOwnership(data: GitHubRawData): AnalysisResult['ownership'] {
    const fetchedAt = new Date(data.fetchedAt);
    const thresholdMs = 180 * 24 * 60 * 60 * 1000; // 180 days

    const nonForkRepos = data.repos.filter((r: GitHubRepo) => !r.isFork);

    const activelyMaintained = nonForkRepos.filter((r: GitHubRepo) => {
      const pushedAt = new Date(r.pushedAt);
      return fetchedAt.getTime() - pushedAt.getTime() < thresholdMs;
    }).length;

    return {
      ownedProjects: nonForkRepos.length,
      activelyMaintained: activelyMaintained,
      confidence:
        nonForkRepos.length > 5
          ? 'high'
          : nonForkRepos.length > 2
            ? 'medium'
            : 'low',
    };
  }

  /**
   * Computes impact metrics.
   */
  private computeImpact(
    signals: ExtractedSignals,
    data: GitHubRawData,
  ): AnalysisResult['impact'] {
    const { activityConsistency, externalContributions } = signals;

    // Activity Level mapping
    let activityLevel: 'low' | 'medium' | 'high' = 'low';
    if (activityConsistency > 0.7) activityLevel = 'high';
    else if (activityConsistency > 0.3) activityLevel = 'medium';

    // Consistency from Trend
    const trend = this.signalExtractor.getTrend(data.contributions);
    let consistency: ConsistencyLevel = 'moderate';
    if (trend === 'ascending') consistency = 'strong';
    else if (trend === 'declining') consistency = 'sparse';

    return {
      activityLevel,
      consistency,
      externalContributions,
      confidence:
        activityLevel === 'high'
          ? 'high'
          : activityLevel === 'medium'
            ? 'medium'
            : 'low',
    };
  }
}
