export function buildFrozenScorecard(analysis: any, candidate: any): object {
  return {
    capturedAt:        new Date().toISOString(),
    candidateUsername: candidate?.user?.username ?? null,
    githubHandle:      candidate?.devProfile?.githubProfile?.githubUsername ?? null,
    walletAddress:     candidate?.devProfile?.web3Profile?.solanaAddress ?? null,

    overallScore:      analysis.overallScore     ?? 0,
    roleFitScore:      analysis.roleFitScore     ?? 0,
    fitTier:           analysis.fitTier          ?? 'PASS',
    confidenceTier:    analysis.confidenceTier   ?? null,
    fraudTier:         analysis.fraudTier        ?? 'CLEAN',
    riskLevel:         analysis.riskLevel        ?? null,

    languagesUsed:     analysis.languagesUsed    ?? [],
    topRepositories:   (analysis.repositories ?? []).slice(0, 5).map((r: any) => ({
      name:            r.name,
      description:     r.description ?? null,
      stars:           r.stargazerCount ?? 0,
      primaryLanguage: r.primaryLanguage ?? null,
      isOriginal:      r.isOriginal ?? true,
    })),
    contributionStats: {
      totalCommits:    analysis.totalCommits     ?? 0,
      totalPRs:        analysis.totalPRs         ?? 0,
      totalReviews:    analysis.totalReviews     ?? 0,
      accountAgeDays:  analysis.accountAgeDays   ?? 0,
    },
    behaviorPattern:   analysis.behaviorPattern  ?? null,

    web3: analysis.web3Score != null ? {
      walletScore:     analysis.web3Score        ?? null,
      transactionCount: analysis.transactionCount ?? null,
      protocolsUsed:   analysis.protocolsUsed    ?? [],
    } : null,

    dimensions:        (analysis.dimensions ?? []).map((d: any) => ({
      name:    d.name,
      score:   d.score,
      weight:  d.weight,
      signals: d.signals ?? [],
    })),
  };
}
