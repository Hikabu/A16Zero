# Implementation Plan: Signal Engine (Stage 2, Step 5)

Build a high-fidelity Signal Engine computing 30+ signals (including 20 core GitHub extraction signals) with tiered prestige weighting, technical depth analysis, and Web3 trajectory detection.

## User Review Required

> [!IMPORTANT]
> **GitHub-Based Web3 Signals**: I will implement the 4 specific Web3-aware GitHub signals (Core Protocol PRs, Security Keyword Depth, Prestige Fork Ratio, Language Trajectory) which do not require RPC but use the enhanced metadata from our updated adapter.

> [!TIP]
> **Compassionate Trajectory**: As requested, the `seniorityTrajectory` will skip months with zero activity. Developers will not be penalized for career breaks.

## Proposed Changes

### 1. GitHub Adapter Deep Sync

#### [MODIFY] [github-adapter.service.ts](file:///home/arturo-clavero/projects/backendProjects/colossseum/server/src/scoring/github-adapter/github-adapter.service.ts)
- Update `fetchGraphQLData` query:
    - Add `repository { owner { login } stargazerCount }` to the `pullRequests` node.
    - Add `pullRequestReviewContributions` with `pullRequest { repository { name owner { login } } }` and `body` (for `reviewDepth` and security keywords).
    - Add `reviews(last: 10)` to `pullRequests` to detect `CHANGES_REQUESTED`.
- Update `fetchEventsData` to use `listEventsForAuthenticatedUser` instead of `listPublicEventsForUser`.

### 2. Signal Engine Internal Logic

#### [NEW] [types.ts](file:///home/arturo-clavero/projects/backendProjects/colossseum/server/src/scoring/signal-engine/types.ts)
- Define a comprehensive `SignalKey` union covering all 30+ fields.
- Signals 1-16: Core activity/collab/growth (Commit variance, PR throughput, etc.).
- **Signals 17-20 (Web3-Aware GitHub Signals)**:
    - `coreProtocolPrMerges`: Whitelist count (Solana, Go-Ethereum, Uniswap, etc.).
    - `securityKeywordReviewDepth`: Ratio of reviews containing 'reentrancy', 'MEV', etc. (Min sample: 5).
    - `prestigeForkToPrRatio`: Ratio of merged PRs to forks for repos > 500 stars. (Min sample: 3).
    - `languageEvolutionTrajectory`: Path detection (TS/JS -> Rust/Go -> Solidity/Anchor).

#### [NEW] [signal-engine.service.ts](file:///home/arturo-clavero/projects/backendProjects/colossseum/server/src/scoring/signal-engine/signal-engine.service.ts)
- **High-Fidelity Review Depth**:
    - Categorized keywords (Logic, Security, Resources, Maintainability).
    - Technical density boosts (Logic/Security = 2x).
    - Formatting/Nitpick cap (0.3).
    - Question mark detection bonus.
- **Tiered Prestige**:
    - **Tier 1 (Core)**: Linux, Node, Solana, etc. (Reliability multiplier).
    - **Tier 2 (Tooling)**: React, Nest, Prisma.
    - **Tier 3 (Dynamic)**: >2k stars + high contributor/commit frequency.
- **Sample Thresholds**: Enforce minimums as per `PLAN.md` (e.g., ≥ 10 PRs for `prAcceptanceRate`).

### 3. Consistency Validator & Firewall

#### [NEW] [consistency-validator.ts](file:///home/arturo-clavero/projects/backendProjects/colossseum/server/src/scoring/signal-engine/consistency-validator.ts)
- Flag anomalies: High acceptance rate vs low contribution depth.

#### [MODIFY] [firewall.service.ts](file:///home/arturo-clavero/projects/backendProjects/colossseum/server/src/scoring/firewall/firewall.service.ts)
- Add **Airdrop Farmer Detection**: Jaccard similarity check against common Web3 script templates.

### 4. Testing Plan

#### [NEW] [signal-engine.service.spec.ts](file:///home/arturo-clavero/projects/backendProjects/colossseum/server/src/scoring/signal-engine/signal-engine.service.spec.ts)
- **Signal 17**: Verify `coreProtocolPrMerges` only counts whitelisted repos.
- **Signal 18**: Verify `securityKeywordReviewDepth` detects 'reentrancy'.
- **Signal 19**: Verify `prestigeForkToPrRatio` excludes < 3 prestige forks.
- **Signal 20**: Verify trajectory score for partial vs full paths.

## Verification Plan

### Automated Tests
- `npm run test src/scoring/signal-engine/signal-engine.service.spec.ts`
- `npm run test:e2e:stage2a`
