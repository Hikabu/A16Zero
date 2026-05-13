import {
  PrismaClient,
  JobStatus,
  RoleType,
  Seniority,
  UserRole,
  ShortlistStatus,
  FraudTier,
  RiskLevel,
  ConfidenceTier,
  BehaviorPattern,
  FitTier,
  PipelineStage,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");
const companies = await Promise.all([
  prisma.company.upsert({
    where: {
      email: "hr@neonstack.dev",
    },
    update: {},
    create: {
      name: "NeonStack Labs",
      legalName: "NeonStack Technologies Ltd",
      country: "USA",
      description: "High-performance backend & infra systems for Web3 apps.",
      website: "https://neonstack.dev",
      email: "hr@neonstack.dev",
      isVerified: true,
      trustScore: 85,
    },
  }),

  prisma.company.upsert({
    where: {
      email: "hr@chainforge.io",
    },
    update: {},
    create: {
      name: "ChainForge",
      country: "Singapore",
      description: "Web3 protocol engineering and DeFi infrastructure.",
      website: "https://chainforge.io",
      email: "hr@chainforge.io",
      isVerified: true,
      trustScore: 92,
    },
  }),

]);
  // -----------------------------
  // JOBS
  // -----------------------------
  const jobs = await Promise.all([
    prisma.jobPost.create({
      data: {
        companyId: companies[0].id,
        title: "Senior Backend Engineer",
        description:
          "Build scalable APIs, distributed systems, and high-performance backend services.",
        location: "Remote",
        employmentType: "full-time",
        bonusAmount: 5000,
        currency: "USD",
        status: JobStatus.ACTIVE,
        roleType: RoleType.BACKEND,
        seniorityLevel: Seniority.SENIOR,
        requiredSkills: ["TypeScript", "Node.js", "PostgreSQL", "Redis"],
        publishedAt: new Date(),
      },
    }),

    prisma.jobPost.create({
      data: {
        companyId: companies[1].id,
        title: "Smart Contract Engineer",
        description:
          "Design and deploy secure Solidity contracts for DeFi protocols.",
        location: "Remote",
        employmentType: "full-time",
        bonusAmount: 8000,
        currency: "USD",
        status: JobStatus.ACTIVE,
        roleType: RoleType.SMART_CONTRACT,
        seniorityLevel: Seniority.MID,
        requiredSkills: ["Solidity", "Foundry", "Hardhat", "EVM"],
        publishedAt: new Date(),
        isWeb3Role: true,
      },
    }),
  ]);

  // -----------------------------
  // USERS + CANDIDATES (FIXED)
  // -----------------------------
 const users = await Promise.all([
  prisma.user.upsert({
    where: { email: "alice.dev@example.com" },
    update: {},
    create: {
      email: "alice.dev@example.com",
      username: "alicedev",
      name: "Alice Johnson",
      role: UserRole.CANDIDATE,
      candidate: {
        create: {
          bio: "Backend engineer focused on scalable APIs.",
          location: "Berlin",
          website: "https://alice.dev",
          devProfile: {
            create: {
              githubProfile: {
                create: {
                  githubUsername: "alicegithub",
                  githubUserId: "1001",
                  encryptedToken: "v1:mock:token:alice",
                  scopes: ["repo", "read:user"],
                  syncStatus: "SYNC_SUCCESS",
                },
              },
            },
          },
        },
      },
    },
    include: {
      candidate: true,
    },
  }),

  prisma.user.upsert({
    where: { email: "bob.web3@example.com" },
    update: {},
    create: {
      email: "bob.web3@example.com",
      username: "bobweb3",
      name: "Bob Lee",
      role: UserRole.CANDIDATE,
      candidate: {
        create: {
          bio: "Smart contract dev building DeFi protocols.",
          location: "Singapore",
          website: "https://bob.dev",
          devProfile: {
            create: {
              githubProfile: {
                create: {
                  githubUsername: "bobgit",
                  githubUserId: "1002",
                  encryptedToken: "v1:mock:token:bob",
                  scopes: ["repo"],
                  syncStatus: "SYNC_SUCCESS",
                },
              },
            },
          },
        },
      },
    },
    include: {
      candidate: true,
    },
  }),
]);
  // -----------------------------
  // SHORTLISTS
  // -----------------------------
  await prisma.shortlist.createMany({
    data: [
      {
        jobPostId: jobs[0].id,
        candidateId: users[0].candidate.id,
        roleFitScore: 88,
        fraudTier: FraudTier.CLEAN,
        riskLevel: RiskLevel.LOW_RISK,
        confidenceTier: ConfidenceTier.FULL,
        behaviorPattern: BehaviorPattern.BALANCED_CONTRIBUTOR,
        fitTier: FitTier.STRONG,
        pipelineStage: PipelineStage.REVIEWED,
        status: ShortlistStatus.SHORTLISTED,
      },
      {
        jobPostId: jobs[1].id,
        candidateId: users[1].candidate.id,
        roleFitScore: 92,
        fraudTier: FraudTier.CLEAN,
        riskLevel: RiskLevel.LOW_RISK,
        confidenceTier: ConfidenceTier.FULL,
        behaviorPattern: BehaviorPattern.WEB3_SPECIALIST,
        fitTier: FitTier.STRONG,
        pipelineStage: PipelineStage.SHORTLISTED,
        status: ShortlistStatus.SHORTLISTED,
      },
    ],
  });

  console.log("✅ Seeding complete");

    await prisma.company.update({
  where: { id: companies[0].id },
  data: {
    totalEscrowsFunded: 0,
    totalEscrowsReleased: 0,
    trustScore: 45,
    isVerifiedPayer: false, // ❌ unverified payer
  },
});

await prisma.company.update({
  where: { id: companies[1].id },
  data: {
    totalEscrowsFunded: 3,
    totalEscrowsReleased: 2,
    trustScore: 88,
    isVerifiedPayer: true, // ✅ verified payer
  },
});

await prisma.jobPost.create({
  data: {
    companyId: companies[0].id,
    title: "Unverified Payer + UNFUNDED Job (control case)",
    description: "Should appear ONLY when no filters are applied.",
    location: "Remote",
    employmentType: "full-time",
    bonusAmount: 3000,
    currency: "USD",
    status: JobStatus.ACTIVE,
    roleType: RoleType.BACKEND,
    seniorityLevel: Seniority.JUNIOR,
    requiredSkills: ["Node.js"],
    publishedAt: new Date(),

    escrowStatus: "UNFUNDED",
    isWeb3Role: false,
  },
});

await prisma.jobPost.create({
  data: {
    companyId: companies[1].id,
    title: "Verified Payer + FUNDED Job (🔥 trusted)",
    description: "Should show when BOTH filters are enabled.",
    location: "Remote",
    employmentType: "full-time",
    bonusAmount: 10000,
    currency: "USD",
    status: JobStatus.ACTIVE,
    roleType: RoleType.SMART_CONTRACT,
    seniorityLevel: Seniority.SENIOR,
    requiredSkills: ["Solidity", "Foundry"],
    publishedAt: new Date(),

    escrowStatus: "FUNDED",
    escrowFundedAt: new Date(),
    isWeb3Role: true,
  },
});
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });