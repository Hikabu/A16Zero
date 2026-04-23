-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CANDIDATE', 'HR', 'HR_ADMIN', 'ORG_MANAGER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'RUNNING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "FraudTier" AS ENUM ('CLEAN', 'FLAGGED', 'DISQUALIFIED');

-- CreateEnum
CREATE TYPE "ConfidenceTier" AS ENUM ('FULL', 'PARTIAL', 'LOW', 'MINIMAL');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW_RISK', 'MEDIUM_RISK', 'HIGH_RISK', 'INSUFFICIENT_DATA');

-- CreateEnum
CREATE TYPE "BehaviorPattern" AS ENUM ('REVIEW_HEAVY_SENIOR', 'COMMIT_HEAVY_MIDLEVEL', 'BALANCED_CONTRIBUTOR', 'OSS_COLLABORATOR', 'EARLY_CAREER', 'RETURNING_DEVELOPER', 'WEB3_SPECIALIST');

-- CreateEnum
CREATE TYPE "Seniority" AS ENUM ('JUNIOR', 'MID', 'SENIOR', 'LEAD');

-- CreateEnum
CREATE TYPE "RoleType" AS ENUM ('BACKEND', 'FRONTEND', 'FULLSTACK', 'INFRASTRUCTURE', 'DATA_ML', 'SMART_CONTRACT', 'WEB3_BACKEND', 'WEB3_FRONTEND', 'WEB3_FULLSTACK', 'DEFI_PROTOCOL', 'SECURITY_WEB3', 'SECURITY', 'GENERALIST');

-- CreateEnum
CREATE TYPE "ClaimType" AS ENUM ('ACTIVITY', 'IMPACT', 'COLLABORATION', 'QUALITY', 'BEHAVIOR', 'GROWTH', 'WEB3');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'REVIEWED', 'SHORTLISTED', 'REJECTED', 'HIRED');

-- CreateEnum
CREATE TYPE "FitTier" AS ENUM ('STRONG', 'PROBE', 'PASS');

-- CreateEnum
CREATE TYPE "ContestationStatus" AS ENUM ('NONE', 'PENDING', 'REVIEWED', 'ACTIONED', 'DISMISSED');

-- CreateTable
CREATE TABLE "Organisation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "atsConnector" JSONB,
    "priorBlendRatio" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CANDIDATE',
    "accountStatus" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bio" VARCHAR(500),
    "careerPath" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeveloperCandidate" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeveloperCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GithubProfile" (
    "id" TEXT NOT NULL,
    "devCandidateId" TEXT NOT NULL,
    "githubUsername" TEXT NOT NULL,
    "githubUserId" TEXT NOT NULL,
    "encryptedToken" TEXT NOT NULL,
    "scopes" TEXT[],
    "lastSyncedAt" TIMESTAMP(3),
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "syncProgress" INTEGER NOT NULL DEFAULT 0,
    "rawDataSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GithubProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Web3Profile" (
    "id" TEXT NOT NULL,
    "devCandidateId" TEXT NOT NULL,
    "evmAddress" TEXT,
    "solanaAddress" TEXT,
    "verifiedContracts" JSONB,
    "onChainMetrics" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Web3Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateSignals" (
    "id" TEXT NOT NULL,
    "devCandidateId" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activeWeeksRatio" DOUBLE PRECISION,
    "prThroughput90d" DOUBLE PRECISION,
    "commitConsistencyScore" DOUBLE PRECISION,
    "avgCommitsPerMonth" DOUBLE PRECISION,
    "commitLongevityMonths" INTEGER,
    "privateOrgActivity" BOOLEAN NOT NULL DEFAULT false,
    "verifiedEmployers" JSONB,
    "verifiedPrivateMonths" INTEGER NOT NULL DEFAULT 0,
    "testPresenceScore" DOUBLE PRECISION,
    "cicdScore" DOUBLE PRECISION,
    "hygieneScore" DOUBLE PRECISION,
    "securityScore" DOUBLE PRECISION,
    "prAcceptanceRate" DOUBLE PRECISION,
    "changeRequestFrequency" DOUBLE PRECISION,
    "reworkRatio" DOUBLE PRECISION,
    "ownershipScore" DOUBLE PRECISION,
    "refactorRatio" DOUBLE PRECISION,
    "docScore" DOUBLE PRECISION,
    "repoLongevityScore" DOUBLE PRECISION,
    "reviewScore" DOUBLE PRECISION,
    "reviewDepth" DOUBLE PRECISION,
    "reviewCommitRatio" DOUBLE PRECISION,
    "externalPrRatio" DOUBLE PRECISION,
    "issueScore" DOUBLE PRECISION,
    "architecturePrScore" DOUBLE PRECISION,
    "depHygieneScore" DOUBLE PRECISION,
    "cicdStagesScore" DOUBLE PRECISION,
    "stackEvolutionScore" DOUBLE PRECISION,
    "growthTrajectoryScore" DOUBLE PRECISION,
    "newLanguagesAdopted" INTEGER,
    "starsOnOriginalRepos" INTEGER,
    "forksOnOriginalRepos" INTEGER,
    "prestigeRepoContribs" INTEGER NOT NULL DEFAULT 0,
    "primaryLanguageDepth" DOUBLE PRECISION,
    "languageBreadth5yr" INTEGER,
    "web3Signals" JSONB,
    "fraudScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fraudFlags" JSONB NOT NULL DEFAULT '[]',
    "fraudTier" "FraudTier" NOT NULL DEFAULT 'CLEAN',
    "dataCoveragePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "privacyAdjustmentApplied" BOOLEAN NOT NULL DEFAULT false,
    "ecosystemCohort" TEXT,
    "effectivePillarWeights" JSONB,
    "inferredSeniority" "Seniority",
    "seniorityConfidence" DOUBLE PRECISION,
    "inferredRole" "RoleType",
    "roleConfidence" DOUBLE PRECISION,
    "behaviorPattern" "BehaviorPattern",
    "behaviorConfidence" DOUBLE PRECISION,
    "confidenceTier" "ConfidenceTier",
    "riskLevel" "RiskLevel",
    "confidenceScore" DOUBLE PRECISION,
    "confidenceCaveats" JSONB NOT NULL DEFAULT '[]',
    "peakCareerScore" DOUBLE PRECISION,
    "recentScore" DOUBLE PRECISION,
    "trendSignal" TEXT,
    "ecosystemPercentile" DOUBLE PRECISION,
    "percentileLabel" TEXT,
    "pillarActivity" DOUBLE PRECISION,
    "pillarQuality" DOUBLE PRECISION,
    "pillarComplexity" DOUBLE PRECISION,
    "pillarCollaboration" DOUBLE PRECISION,
    "pillarArchitecture" DOUBLE PRECISION,
    "pillarGrowth" DOUBLE PRECISION,
    "pillarWeb3" DOUBLE PRECISION,
    "notObservable" JSONB NOT NULL DEFAULT '[]',
    "languageDistribution" JSONB,
    "topRepos" JSONB,

    CONSTRAINT "CandidateSignals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeveloperSnapshot" (
    "id" TEXT NOT NULL,
    "devCandidateId" TEXT NOT NULL,
    "role" "RoleType" NOT NULL,
    "roleConfidence" DOUBLE PRECISION NOT NULL,
    "seniority" "Seniority" NOT NULL,
    "seniorityConf" DOUBLE PRECISION NOT NULL,
    "summary" TEXT NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "decisionSignal" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeveloperSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareerTimeline" (
    "id" TEXT NOT NULL,
    "devCandidateId" TEXT NOT NULL,
    "phases" JSONB NOT NULL,
    "trajectory" TEXT NOT NULL,
    "gapEvents" JSONB NOT NULL DEFAULT '[]',
    "peakWindow" JSONB,
    "contextInference" JSONB,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CareerTimeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateClaim" (
    "id" TEXT NOT NULL,
    "devCandidateId" TEXT NOT NULL,
    "claimType" "ClaimType" NOT NULL,
    "claimKey" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "supportingSignals" JSONB NOT NULL,
    "evidenceLinks" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "roleType" "RoleType" NOT NULL,
    "seniorityLevel" "Seniority",
    "requiredSignals" JSONB,
    "weightOverrides" JSONB,
    "historicalWeight" DOUBLE PRECISION DEFAULT 0.7,
    "recentWeight" DOUBLE PRECISION DEFAULT 0.3,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closesAt" TIMESTAMP(3),

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "decisionCard" JSONB NOT NULL,
    "gapReport" JSONB NOT NULL,
    "capabilityStatements" JSONB NOT NULL,
    "confidenceEnvelope" JSONB NOT NULL,
    "behaviorPattern" "BehaviorPattern",
    "temporalProfile" JSONB,
    "roleFitScore" DOUBLE PRECISION NOT NULL,
    "fitTier" "FitTier" NOT NULL,
    "fraudTier" "FraudTier" NOT NULL,
    "candidateNote" VARCHAR(280),
    "hrNotes" TEXT,
    "contestation" JSONB,
    "contestationStatus" "ContestationStatus" NOT NULL DEFAULT 'NONE',
    "contestationResolvedAt" TIMESTAMP(3),
    "contestationActorId" TEXT,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HireOutcome" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "wasHired" BOOLEAN NOT NULL,
    "performanceRating" DOUBLE PRECISION,
    "behaviorPatternAtDecision" "BehaviorPattern",
    "temporalProfileSnapshot" JSONB,
    "capabilityStatementsAtDecision" JSONB,
    "confidenceAtDecision" DOUBLE PRECISION,
    "roleFitScore" DOUBLE PRECISION,
    "pillarScores" JSONB,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HireOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformPrior" (
    "id" TEXT NOT NULL,
    "behaviorPattern" "BehaviorPattern" NOT NULL,
    "hireRate" DOUBLE PRECISION NOT NULL,
    "avgPerformance90d" DOUBLE PRECISION,
    "sampleSize" INTEGER NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformPrior_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BenchmarkCohort" (
    "id" TEXT NOT NULL,
    "cohortKey" TEXT NOT NULL,
    "pillarDistributions" JSONB NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BenchmarkCohort_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrSavedView" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobId" TEXT,
    "name" TEXT NOT NULL,
    "filterConfig" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HrSavedView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoiSnapshot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "avgScreenMinutes" DOUBLE PRECISION,
    "interviewOfferRatio" DOUBLE PRECISION,
    "timeToFirstDecision" DOUBLE PRECISION,
    "costDelta" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoiSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FairnessReport" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "quarter" TEXT NOT NULL,
    "reportPdf" BYTEA,
    "flagCount" INTEGER NOT NULL DEFAULT 0,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FairnessReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Candidate_userId_key" ON "Candidate"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DeveloperCandidate_candidateId_key" ON "DeveloperCandidate"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "GithubProfile_devCandidateId_key" ON "GithubProfile"("devCandidateId");

-- CreateIndex
CREATE UNIQUE INDEX "GithubProfile_githubUsername_key" ON "GithubProfile"("githubUsername");

-- CreateIndex
CREATE UNIQUE INDEX "GithubProfile_githubUserId_key" ON "GithubProfile"("githubUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Web3Profile_devCandidateId_key" ON "Web3Profile"("devCandidateId");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateSignals_devCandidateId_key" ON "CandidateSignals"("devCandidateId");

-- CreateIndex
CREATE UNIQUE INDEX "DeveloperSnapshot_devCandidateId_key" ON "DeveloperSnapshot"("devCandidateId");

-- CreateIndex
CREATE UNIQUE INDEX "CareerTimeline_devCandidateId_key" ON "CareerTimeline"("devCandidateId");

-- CreateIndex
CREATE INDEX "CandidateClaim_devCandidateId_isActive_idx" ON "CandidateClaim"("devCandidateId", "isActive");

-- CreateIndex
CREATE INDEX "Job_tenantId_status_roleType_idx" ON "Job"("tenantId", "status", "roleType");

-- CreateIndex
CREATE INDEX "Application_tenantId_jobId_roleFitScore_idx" ON "Application"("tenantId", "jobId", "roleFitScore" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Application_jobId_candidateId_key" ON "Application"("jobId", "candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "HireOutcome_applicationId_key" ON "HireOutcome"("applicationId");

-- CreateIndex
CREATE INDEX "HireOutcome_tenantId_wasHired_idx" ON "HireOutcome"("tenantId", "wasHired");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformPrior_behaviorPattern_key" ON "PlatformPrior"("behaviorPattern");

-- CreateIndex
CREATE UNIQUE INDEX "BenchmarkCohort_cohortKey_key" ON "BenchmarkCohort"("cohortKey");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_entityId_timestamp_idx" ON "AuditLog"("tenantId", "entityId", "timestamp");

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeveloperCandidate" ADD CONSTRAINT "DeveloperCandidate_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GithubProfile" ADD CONSTRAINT "GithubProfile_devCandidateId_fkey" FOREIGN KEY ("devCandidateId") REFERENCES "DeveloperCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Web3Profile" ADD CONSTRAINT "Web3Profile_devCandidateId_fkey" FOREIGN KEY ("devCandidateId") REFERENCES "DeveloperCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateSignals" ADD CONSTRAINT "CandidateSignals_devCandidateId_fkey" FOREIGN KEY ("devCandidateId") REFERENCES "DeveloperCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeveloperSnapshot" ADD CONSTRAINT "DeveloperSnapshot_devCandidateId_fkey" FOREIGN KEY ("devCandidateId") REFERENCES "DeveloperCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerTimeline" ADD CONSTRAINT "CareerTimeline_devCandidateId_fkey" FOREIGN KEY ("devCandidateId") REFERENCES "DeveloperCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateClaim" ADD CONSTRAINT "CandidateClaim_devCandidateId_fkey" FOREIGN KEY ("devCandidateId") REFERENCES "DeveloperCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
