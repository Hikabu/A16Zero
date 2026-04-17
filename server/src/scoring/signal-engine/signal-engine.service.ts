import { Injectable, Logger } from '@nestjs/common';
import { 
  SignalComputeResult, 
  SignalKey, 
  SignalValue, 
  ExcludedSignal, 
  PillarKey 
} from './types';
import { FirewallResult } from '../firewall/types';

@Injectable()
export class SignalEngineService {
  private readonly logger = new Logger(SignalEngineService.name);

  private readonly PRESTIGE_TIER_1 = new Set([
    'solana-labs/solana', 'coral-xyz/anchor', 'jito-foundation/jito-solana',
    'ethereum/go-ethereum', 'paradigmxyz/reth', 'foundry-rs/foundry',
    'OpenZeppelin/openzeppelin-contracts', 'Uniswap/v3-core', 'aave/aave-v3-core',
    'torvalds/linux', 'node-js/node', 'rust-lang/rust', 'postgres/postgres'
  ]);

  private readonly PRESTIGE_TIER_2 = new Set([
    'facebook/react', 'nestjs/nest', 'prisma/prisma', 'kubernetes/kubernetes',
    'solana-labs/solana-program-library', 'facebook/relay', 'facebook/jest'
  ]);

  private readonly SECURITY_KEYWORDS = [
    'reentrancy', 'overflow', 'underflow', 'access control', 'uninitialized', 
    'leak', 'double spend', 'front-run', 'sandwich', 'MEV', 'flash loan', 'oracle manipulation'
  ];

  private readonly TECH_KEYWORDS = {
    LOGIC: ['bottleneck', 'complexity', 'O(n)', 'race condition', 'idempotent', 'memoize', 'latency', 'throughput', 'atomic'],
    SECURITY: ['sanitize', 'overflow', 'reentrancy', 'validation', 'edge case', 'error handling', 'fallback', 'permissions', 'vulnerability'],
    RESOURCES: ['memory leak', 'garbage collection', 'allocation', 'connection pool', 'cleanup', 'buffer', 'dispose', 'singleton'],
    MAINTAINABILITY: ['decouple', 'abstraction', 'boilerplate', 'consistency', 'dependency injection', 'interface', 'side effect', 'stateless']
  };

  /**
   * Main entry point for signal computation.
   */
  compute(username: string, firewallResult: FirewallResult, accountCreatedAt: string): SignalComputeResult {
    const { cleanedData, fraudScore, fraudTier } = firewallResult;
    const signals: Record<string, SignalValue> = {};
    const excludedSignals: ExcludedSignal[] = [];

    // Initialize all signals as excluded
    this.initializeSignals(signals);

    // Compute Pillars
    this.computeActivityPillar(username, cleanedData, signals, excludedSignals, new Date(accountCreatedAt));
    this.computeCollaborationPillar(username, cleanedData, signals, excludedSignals);
    this.computeQualityPillar(username, cleanedData, signals, excludedSignals);
    this.computeReliabilityPillar(cleanedData, signals, excludedSignals);
    this.computeImpactPillar(cleanedData, signals, excludedSignals);
    this.computeGrowthPillar(cleanedData, signals, excludedSignals);

    return {
      signals: signals as Record<SignalKey, SignalValue>,
      excludedSignals,
      consistencyNotes: this.runConsistencyChecks(signals),
      pillarSignals: this.getPillarMapping(),
      fraudScore,
      fraudTier,
    };
  }

  private setSignal(signals: Record<string, SignalValue>, key: SignalKey, value: any, options: { confidence?: number; sampleSize?: number; minimumRequired?: number } = {}) {
    signals[key] = {
      value,
      confidence: options.confidence ?? 1,
      excluded: false,
      sampleSize: options.sampleSize,
      minimumRequired: options.minimumRequired,
    };
  }

  private excludeSignal(signals: Record<string, SignalValue>, excluded: ExcludedSignal[], key: SignalKey, options: { reason: string; sampleSize: number; minimumRequired: number }) {
    const signal: SignalValue = {
      value: null,
      confidence: 0,
      excluded: true,
      exclusionReason: options.reason,
      sampleSize: options.sampleSize,
      minimumRequired: options.minimumRequired,
    };
    signals[key] = signal;
    excluded.push({
      key,
      reason: options.reason,
      sampleSize: options.sampleSize,
      minimumRequired: options.minimumRequired,
    });
  }

  private initializeSignals(signals: Record<string, SignalValue>) {
    const keys: SignalKey[] = [
      'activeWeeksRatio', 'commitConsistencyScore', 'prThroughput90d',
      'reviewDepth', 'prReviewCount12m', 'externalPrRatio',
      'prAcceptanceRate', 'changeRequestFrequency', 'reworkRatio',
      'testFilePresence', 'cicdConfigDetection', 'starsOnOriginalRepos',
      'highPrestigeRepoContributions', 'newLanguagesAdopted1yr', 'seniorityTrajectory',
      'privateOrgActivity', 'coreProtocolPrMerges', 'securityKeywordReviewDepth',
      'prestigeForkToPrRatio', 'languageEvolutionTrajectory'
    ];
    for (const key of keys) {
      signals[key] = { value: null, confidence: 0, excluded: true, exclusionReason: 'Initial state' };
    }
  }

  private runConsistencyChecks(signals: Record<string, SignalValue>): string[] {
    const notes: string[] = [];
    const acceptance = signals['prAcceptanceRate'];
    const depth = signals['reviewDepth'];

    if (acceptance && depth && !acceptance.excluded && !depth.excluded) {
      if ((acceptance.value as number) > 0.95 && (depth.value as number) < 0.2) {
        notes.push('Anomaly: High acceptance rate with very low collaboration depth.');
      }
    }

    const crFreq = signals['changeRequestFrequency'];
    if (acceptance && crFreq && !acceptance.excluded && !crFreq.excluded) {
      if ((acceptance.value as number) > 0.90 && (crFreq.value as number) > 0.5) {
        notes.push('Anomaly: Unusual acceptance pattern given change request frequency.');
      }
    }
    return notes;
  }

  private getPillarMapping(): Record<PillarKey, SignalKey[]> {
    return {
      ACTIVITY: ['activeWeeksRatio', 'commitConsistencyScore', 'prThroughput90d', 'privateOrgActivity'],
      COLLABORATION: ['reviewDepth', 'prReviewCount12m', 'externalPrRatio', 'coreProtocolPrMerges', 'securityKeywordReviewDepth', 'prestigeForkToPrRatio'],
      QUALITY: ['prAcceptanceRate', 'changeRequestFrequency', 'reworkRatio'],
      RELIABILITY: ['testFilePresence', 'cicdConfigDetection'],
      IMPACT: ['starsOnOriginalRepos', 'highPrestigeRepoContributions'],
      GROWTH: ['newLanguagesAdopted1yr', 'seniorityTrajectory', 'languageEvolutionTrajectory']
    };
  }

  // --- ACTIVITY PILLAR ---
  private computeActivityPillar(username: string, data: any, signals: Record<string, SignalValue>, excluded: ExcludedSignal[], accountCreatedAt: Date) {
    const calendar = data.graphql.contributionCalendar;
    const repoCommits = data.rest.commits; // repoId -> commits[]
    const events = data.events.events;
    
    // 1. Pre-process commits to group by week (excluding streakOnly)
    const weeklyNonStreakCommits: Record<string, number> = {};
    const allNonStreakCommits: any[] = [];
    
    for (const repoId in repoCommits) {
      for (const commit of repoCommits[repoId]) {
        if (commit.streakOnly) continue;
        const date = new Date(commit.commit?.author?.date || commit.created_at);
        const week = this.getWeekString(date);
        weeklyNonStreakCommits[week] = (weeklyNonStreakCommits[week] || 0) + 1;
        allNonStreakCommits.push(commit);
      }
    }

    // 2. activeWeeksRatio
    // weeks (out of 52) where totalContributions > 0 AND at least 1 non-streakOnly commit
    const calendarWeeks = calendar.weeks || [];
    const last52Weeks = calendarWeeks.slice(-52);
    let activeWeeksCount = 0;
    
    for (const week of last52Weeks) {
      const weekStr = this.getWeekString(new Date(week.contributionDays[0].date));
      const hasContributions = week.contributionDays.some((d: any) => d.contributionCount > 0);
      if (hasContributions && (weeklyNonStreakCommits[weekStr] || 0) > 0) {
        activeWeeksCount++;
      }
    }

    const accountAgeMonths = (new Date().getTime() - accountCreatedAt.getTime()) / (1000 * 3600 * 24 * 30.44);
    const totalActiveMonths = calendarWeeks.filter((w: any) => w.contributionDays.some((d: any) => d.contributionCount > 0)).length / 4.345;

    if (accountAgeMonths >= 6 && totalActiveMonths >= 6) {
      this.setSignal(signals, 'activeWeeksRatio', activeWeeksCount / 52, {
        sampleSize: activeWeeksCount
      });
    } else {
      this.excludeSignal(signals, excluded, 'activeWeeksRatio', {
        reason: accountAgeMonths < 6 ? 'Account age < 6 months' : 'Less than 6 active months in history',
        sampleSize: Math.floor(totalActiveMonths),
        minimumRequired: 6
      });
    }

    // 3. commitConsistencyScore
    // Take the last 52 weeks of weekly commit counts (excluding streakOnly)
    // Formula: Math.max(0, 1 - (stdDev / (median + 0.001)))
    const weeksWithCommits = calendarWeeks.filter((w: any) => {
        const weekStr = this.getWeekString(new Date(w.contributionDays[0].date));
        return (weeklyNonStreakCommits[weekStr] || 0) > 0;
    }).length;

    if (weeksWithCommits >= 24) { // 6 active months
      const counts52: number[] = [];
      const now = new Date();
      for (let i = 0; i < 52; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - (i * 7));
        const weekStr = this.getWeekString(d);
        counts52.push(weeklyNonStreakCommits[weekStr] || 0);
      }
      
      const median = this.calculateMedian(counts52);
      const stdDev = this.calculateStdDev(counts52);
      const score = Math.max(0, Math.min(1, 1 - (stdDev / (median + 0.001))));
      this.setSignal(signals, 'commitConsistencyScore', score, {
        sampleSize: weeksWithCommits
      });
    } else {
      this.excludeSignal(signals, excluded, 'commitConsistencyScore', {
        reason: 'Need 6 active months (>= 24 weeks with commits)',
        sampleSize: weeksWithCommits,
        minimumRequired: 24
      });
    }

    // 4. prThroughput90d
    const prs = data.graphql.pullRequests;
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const recentPrs = prs.filter((p: any) => new Date(p.createdAt) > ninetyDaysAgo);
    this.setSignal(signals, 'prThroughput90d', Number((recentPrs.length / 12.857).toFixed(2)), {
      sampleSize: recentPrs.length
    });

    // 5. privateOrgActivity
    const hasOrgPush = events.some((e: any) => 
        e.type === 'PushEvent' && 
        e.public === false && 
        e.org && 
        e.repo && e.repo.name // Additional safety
    );
    this.setSignal(signals, 'privateOrgActivity', hasOrgPush ? 1 : 0, {
      confidence: 0.9,
      sampleSize: hasOrgPush ? 1 : 0
    });
  }

  // --- COLLABORATION PILLAR ---
  private computeCollaborationPillar(username: string, data: any, signals: Record<string, SignalValue>, excluded: ExcludedSignal[]) {
    const prs = data.graphql.pullRequests || [];
    const reviews = data.graphql.reviewsGiven || [];
    
    // 1. reviewDepth
    const standardPhrases = ['lgtm', '+1', 'looks good', 'fixed', 'ack', 'merge'];
    const substantiveReviews = reviews.filter((r: any) => {
      const body = (r.body || '').toLowerCase().trim();
      if (body.length < 10) return false;
      if (standardPhrases.some(p => body.includes(p) && body.length < 25)) return false;
      return true;
    });

    if (substantiveReviews.length >= 5) {
      const totalWords = substantiveReviews.reduce((acc: number, r: any) => acc + this.countWords(r.body), 0);
      const avgWords = totalWords / substantiveReviews.length;
      this.setSignal(signals, 'reviewDepth', Math.min(1, avgWords / 50), {
        sampleSize: substantiveReviews.length
      });
    } else {
      this.excludeSignal(signals, excluded, 'reviewDepth', {
        reason: 'Need 5 substantive reviews',
        sampleSize: substantiveReviews.length,
        minimumRequired: 5
      });
    }

    // 2. prReviewCount12m
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
    const recentReviews = reviews.filter((r: any) => new Date(r.createdAt) > twelveMonthsAgo);
    this.setSignal(signals, 'prReviewCount12m', recentReviews.length, {
      sampleSize: recentReviews.length
    });

    // 3. externalPrRatio
    const externalPrs = prs.filter((p: any) => p.repository.owner.login.toLowerCase() !== username.toLowerCase());
    if (prs.length >= 5) {
      this.setSignal(signals, 'externalPrRatio', externalPrs.length / prs.length, {
        sampleSize: prs.length
      });
    } else {
      this.excludeSignal(signals, excluded, 'externalPrRatio', {
        reason: 'Need 5 PRs total',
        sampleSize: prs.length,
        minimumRequired: 5
      });
    }

    // 4. coreProtocolPrMerges
    const CORE_PROTOCOLS = [
      'ethereum/go-ethereum', 'solana-labs/solana', 'cosmos/cosmos-sdk', 
      'bitcoin/bitcoin', 'polkadot-js/api', 'near/nearcore', 
      'aptos-labs/aptos-core', 'mystenlabs/sui'
    ];
    const coreMerges = prs.filter((p: any) => 
      p.mergedAt && 
      CORE_PROTOCOLS.includes(`${p.repository.owner.login}/${p.repository.name}`.toLowerCase())
    );
    this.setSignal(signals, 'coreProtocolPrMerges', coreMerges.length, {
      sampleSize: coreMerges.length
    });

    // 5. securityKeywordReviewDepth
    const SECURITY_TERMS = [
      'overflow', 'reentrancy', 'slippage', 'audit', 'vuln', 'exploit', 
      'attack', 'bypass', 'security', 'leak', 'private key', 'signer'
    ];
    const securityReviews = reviews.filter((r: any) => 
      this.countKeywords(r.body, SECURITY_TERMS) > 0
    );
    if (reviews.length >= 5) {
      this.setSignal(signals, 'securityKeywordReviewDepth', securityReviews.length / reviews.length, {
        confidence: 0.8,
        sampleSize: reviews.length
      });
    } else {
      this.excludeSignal(signals, excluded, 'securityKeywordReviewDepth', {
        reason: 'Need 5 reviews',
        sampleSize: reviews.length,
        minimumRequired: 5
      });
    }

    // 6. prestigeForkToPrRatio
    const prestigeRepos = new Set(prs
      .filter((p: any) => p.repository.stargazerCount >= 500 && p.repository.owner.login.toLowerCase() !== username.toLowerCase())
      .map((p: any) => `${p.repository.owner.login}/${p.repository.name}`)
    );
    const prestigeMerged = new Set(prs
      .filter((p: any) => 
        p.mergedAt && 
        p.repository.stargazerCount >= 500 && 
        p.repository.owner.login.toLowerCase() !== username.toLowerCase()
      )
      .map((p: any) => `${p.repository.owner.login}/${p.repository.name}`)
    );

    if (prestigeRepos.size >= 3) {
      this.setSignal(signals, 'prestigeForkToPrRatio', prestigeMerged.size / prestigeRepos.size, {
        confidence: 0.7,
        sampleSize: prestigeRepos.size
      });
    } else {
      this.excludeSignal(signals, excluded, 'prestigeForkToPrRatio', {
        reason: 'Need contributions to 3 repos with >= 500 stars',
        sampleSize: prestigeRepos.size,
        minimumRequired: 3
      });
    }
  }

  // --- QUALITY PILLAR ---
  private computeQualityPillar(username: string, data: any, signals: Record<string, SignalValue>, excluded: ExcludedSignal[]) {
    const prs = data.graphql.pullRequests || [];
    const externalPrs = prs.filter((p: any) => p.repository.owner.login.toLowerCase() !== username.toLowerCase());
    
    // 1. prAcceptanceRate
    if (externalPrs.length >= 10) {
      const merged = externalPrs.filter((p: any) => p.mergedAt).length;
      this.setSignal(signals, 'prAcceptanceRate', merged / externalPrs.length, {
        sampleSize: externalPrs.length
      });
    } else {
      this.excludeSignal(signals, excluded, 'prAcceptanceRate', {
        reason: 'Need 10 external PRs',
        sampleSize: externalPrs.length,
        minimumRequired: 10
      });
    }

    // 2. changeRequestFrequency
    const reviewedPrs = prs.filter((p: any) => (p.reviews?.nodes || []).some((r: any) => r.author.login.toLowerCase() !== username.toLowerCase()));
    if (reviewedPrs.length >= 10) {
      const crCount = reviewedPrs.filter((p: any) => p.reviews.nodes.some((r: any) => r.state === 'CHANGES_REQUESTED')).length;
      this.setSignal(signals, 'changeRequestFrequency', crCount / reviewedPrs.length, {
        sampleSize: reviewedPrs.length
      });
    } else {
      this.excludeSignal(signals, excluded, 'changeRequestFrequency', {
        reason: 'Need 10 reviewed PRs',
        sampleSize: reviewedPrs.length,
        minimumRequired: 10
      });
    }

    // 3. reworkRatio
    const mergedPrs = prs.filter((p: any) => p.mergedAt);
    if (mergedPrs.length >= 10) {
      let totalReworkCommits = 0;
      for (const pr of mergedPrs) {
        const firstCr = (pr.reviews?.nodes || [])
          .filter((r: any) => r.state === 'CHANGES_REQUESTED')
          .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
        
        if (firstCr) {
          const crDate = new Date(firstCr.createdAt);
          const postCrCommits = (pr.commits?.nodes || []).filter((c: any) => 
            new Date(c.commit.pushedDate || c.commit.committedDate) > crDate
          );
          totalReworkCommits += postCrCommits.length;
        }
      }
      this.setSignal(signals, 'reworkRatio', Math.min(1, totalReworkCommits / (mergedPrs.length * 2)), {
        confidence: 0.6,
        sampleSize: mergedPrs.length
      });
    } else {
      this.excludeSignal(signals, excluded, 'reworkRatio', {
        reason: 'Need 10 merged PRs',
        sampleSize: mergedPrs.length,
        minimumRequired: 10
      });
    }
  }

  // --- RELIABILITY PILLAR ---
  private computeReliabilityPillar(data: any, signals: Record<string, SignalValue>, excluded: ExcludedSignal[]) {
    const repos = data.rest.repos || [];
    const fileTrees = data.rest.fileTrees || {};
    
    // 1. testFilePresence (Weighted average)
    let totalWeightedScore = 0;
    let totalWeight = 0;
    
    for (const repo of repos) {
      const weight = repo.tutorialWeight || 1.0;
      const files = fileTrees[repo.id.toString()] || [];
      const hasTests = files.some(f => 
        f.includes('test') || f.includes('spec') || f.includes('__tests__') || 
        f.endsWith('.t.sol') || f.endsWith('.test.ts')
      );
      totalWeightedScore += (hasTests ? 1 : 0) * weight;
      totalWeight += weight;
    }
    
    this.setSignal(signals, 'testFilePresence', totalWeight > 0 ? totalWeightedScore / totalWeight : 0, {
      confidence: 0.8
    });

    // 2. cicdConfigDetection
    const cicdPaths = ['.github/workflows', '.circleci', '.travis.yml', 'foundry.toml', 'hardhat.config.js', 'hardhat.config.ts'];
    const hasCicd = repos.some(repo => {
      const files = fileTrees[repo.id.toString()] || [];
      return files.some(f => cicdPaths.some(cp => f.startsWith(cp) || f === cp));
    });
    
    this.setSignal(signals, 'cicdConfigDetection', hasCicd ? 1 : 0);
  }

  // --- IMPACT PILLAR ---
  private computeImpactPillar(data: any, signals: Record<string, SignalValue>, excluded: ExcludedSignal[]) {
    const repos = data.rest.repos || [];
    const prs = data.graphql.pullRequests || [];
    
    // 1. starsOnOriginalRepos
    let impactScore = 0;
    const now = new Date();
    for (const repo of repos) {
      if (repo.fork || repo.tutorialWeight < 1.0) continue;
      const createdAt = new Date(repo.createdAt || repo.created_at);
      const ageMonths = (now.getTime() - createdAt.getTime()) / (1000 * 3600 * 24 * 30.44);
      const stars = repo.stargazerCount || repo.stargazers_count || 0;
      impactScore += stars * Math.log(ageMonths + 1);
    }
    
    this.setSignal(signals, 'starsOnOriginalRepos', Math.min(1, impactScore / 1000), {
      sampleSize: repos.length
    });

    // 2. highPrestigeRepoContributions
    const externalMergedPrs = prs.filter((p: any) => p.mergedAt && p.repository.owner.login.toLowerCase() !== data.username?.toLowerCase());
    const prestigeContributions = externalMergedPrs.filter((p: any) => p.repository.stargazerCount >= 1000);
    
    if (externalMergedPrs.length >= 3) {
      this.setSignal(signals, 'highPrestigeRepoContributions', prestigeContributions.length >= 3, {
        confidence: 0.9,
        sampleSize: externalMergedPrs.length
      });
    } else {
      this.excludeSignal(signals, excluded, 'highPrestigeRepoContributions', {
        reason: 'Need 3 merged external PRs',
        sampleSize: externalMergedPrs.length,
        minimumRequired: 3
      });
    }
  }

  // --- GROWTH PILLAR ---
  private computeGrowthPillar(data: any, signals: Record<string, SignalValue>, excluded: ExcludedSignal[]) {
    const repos = data.rest.repos || [];
    const languagesMap = data.rest.languages || {};
    
    // 1. newLanguagesAdopted1yr
    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 3600 * 1000);
    const twoYearsAgo = new Date(now.getTime() - 730 * 24 * 3600 * 1000);
    
    const oldLangs = new Set<string>();
    const newLangs = new Set<string>();
    
    for (const repo of repos) {
      const pushedDate = new Date(repo.pushedAt || repo.pushed_at);
      const langs = Object.keys(languagesMap[repo.id.toString()] || {});
      
      if (pushedDate >= oneYearAgo) {
        langs.forEach(l => newLangs.add(l));
      } else if (pushedDate >= twoYearsAgo) {
        langs.forEach(l => oldLangs.add(l));
      }
    }
    
    const newlyAdopted = Array.from(newLangs).filter(l => !oldLangs.has(l));
    const earliestRepo = repos.reduce((a: any, b: any) => 
      new Date(a.createdAt || a.created_at) < new Date(b.createdAt || b.created_at) ? a : b, repos[0]
    );
    const accountAgeMonths = earliestRepo ? (now.getTime() - new Date(earliestRepo.createdAt || earliestRepo.created_at).getTime()) / (1000 * 3600 * 24 * 30.44) : 0;
    
    if (accountAgeMonths >= 18) {
      this.setSignal(signals, 'newLanguagesAdopted1yr', newlyAdopted.length, {
        confidence: 0.8,
        sampleSize: newlyAdopted.length
      });
    } else {
      this.excludeSignal(signals, excluded, 'newLanguagesAdopted1yr', {
        reason: 'Account age < 18 months',
        sampleSize: Math.floor(accountAgeMonths),
        minimumRequired: 18
      });
    }

    // 2. seniorityTrajectory
    const prs = data.graphql.pullRequests || [];
    const reviews = data.graphql.reviewsGiven || [];
    const repoCommits = data.rest.commits || {};
    
    const monthlyRatios: number[] = [];
    for (let i = 23; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const monthReviews = reviews.filter((r: any) => {
        const d = new Date(r.createdAt);
        return d >= monthStart && d <= monthEnd;
      }).length;
      
      let monthCommits = 0;
      for (const repoId in repoCommits) {
        monthCommits += repoCommits[repoId].filter((c: any) => {
          const d = new Date(c.commit?.author?.date || c.created_at);
          return d >= monthStart && d <= monthEnd;
        }).length;
      }
      
      if (monthReviews + monthCommits > 0) {
        monthlyRatios.push(monthReviews / (monthCommits + 0.1));
      }
    }
    
    if (monthlyRatios.length >= 6) {
      const slope = this.calculateLinearRegressionSlope(monthlyRatios);
      this.setSignal(signals, 'seniorityTrajectory', Math.max(0, Math.min(1, 0.5 + slope)), {
        confidence: 0.7,
        sampleSize: monthlyRatios.length
      });
    } else {
      this.excludeSignal(signals, excluded, 'seniorityTrajectory', {
        reason: 'Need 6 months of activity',
        sampleSize: monthlyRatios.length,
        minimumRequired: 6
      });
    }

    // 3. languageEvolutionTrajectory
    const allLangs = new Set(Object.entries(languagesMap).flatMap(([repoId, langs]) => Object.keys(langs as object)));
    const hasBase = allLangs.has('TypeScript') || allLangs.has('JavaScript');
    const hasGoRust = allLangs.has('Go') || allLangs.has('Rust');
    const hasWeb3 = allLangs.has('Solidity') || allLangs.has('Vyper') || allLangs.has('Move');
    
    let pathScore = 0;
    if (hasBase && hasGoRust && hasWeb3) pathScore = 1.0;
    else if (hasBase && hasGoRust) pathScore = 0.5;
    else if (hasGoRust && hasWeb3) pathScore = 0.7;
    
    this.setSignal(signals, 'languageEvolutionTrajectory', pathScore, {
      confidence: 0.9
    });
  }

  // --- HELPERS ---
  private calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  private calculateStdDev(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Linear regression using least-squares slope formula
   */
  private calculateLinearRegressionSlope(values: number[]): number {
    const n = values.length;
    if (n < 2) return 0;

    let sumX = 0; let sumY = 0; let sumXY = 0; let sumXX = 0;
    for (let i = 0; i < n; i++) {
        const x = i + 1; const y = values[i];
        sumX += x; sumY += y; sumXY += x * y; sumXX += x * x;
    }
    const denominator = n * sumXX - sumX * sumX;
    if (denominator === 0) return 0;
    return (n * sumXY - sumX * sumY) / denominator;
  }

  private countWords(text: string): number {
    if (!text || typeof text !== 'string') return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  private getWeekString(date: Date): string {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${weekNo}`;
  }

  private countKeywords(text: string, list: string[]): number {
    if (!text) return 0;
    const lower = text.toLowerCase();
    return list.filter(kw => lower.includes(kw.toLowerCase())).length;
  }
}
