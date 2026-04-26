import { PrismaClient, Prisma } from '@prisma/client';
import { faker } from '@faker-js/faker';
import {
  JobStatus,
  RoleType,
  Seniority,
  UserRole,
  AuthProvider,
  FraudTier,
  RiskLevel,
  ConfidenceTier,
  BehaviorPattern,
  FitTier,
} from '@prisma/client';

const prisma = new PrismaClient();

// Helper to get random enum value
function getRandomEnum<T extends Record<string, any>>(enumObj: T): T[keyof T] {
  const values = Object.values(enumObj) as T[keyof T][];
  return values[Math.floor(Math.random() * values.length)];
}

// Helper to get random item from array
function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data
  console.log('🗑️  Clearing existing data...');
  await prisma.shortlist.deleteMany({});
  await prisma.jobPost.deleteMany({});
  await prisma.web3Profile.deleteMany({});
  await prisma.githubProfile.deleteMany({});
  await prisma.developerCandidate.deleteMany({});
  await prisma.candidate.deleteMany({});
  await prisma.authAccount.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.company.deleteMany({});

  // ─── CREATE COMPANIES ───────────────────────────────────────────
  console.log('🏢 Creating 15 companies...');
  const companies = await Promise.all(
    Array.from({ length: 15 }).map((_, index) =>
      prisma.company.create({
        data: {
          name: faker.company.name(),
          legalName: faker.company.name() + ' Inc.',
          registrationNumber: `REG-${String(index + 1).padStart(5, '0')}`,
          country: getRandomItem(['US', 'UK', 'Canada', 'Singapore', 'Switzerland']),
          isVerified: faker.datatype.boolean({ probability: 0.7 }),
          verifiedAt: faker.datatype.boolean({ probability: 0.7 })
            ? faker.date.past()
            : null,
          email: faker.internet.email(),
          walletAddress: `0x${faker.string.hexadecimal({ length: 40 }).slice(2)}`,
          smartAccountAddress: `0x${faker.string.hexadecimal({ length: 40 }).slice(2)}`,
          privyId: `privy_${faker.string.alphanumeric(20)}`,
        },
      })
    )
  );
  console.log(`✅ Created ${companies.length} companies`);

  // ─── CREATE USERS & CANDIDATES ───────────────────────────────────
  console.log('👥 Creating 30 candidate profiles...');
  const candidates: any[] = [];

  for (let i = 0; i < 30; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email({ firstName, lastName }).toLowerCase();

    // Create User
    const user = await prisma.user.create({
      data: {
        email,
        username: faker.internet.username({ firstName, lastName }).toLowerCase(),
        firstName,
        lastName,
        role: UserRole.CANDIDATE,
        isEmailVerified: faker.datatype.boolean({ probability: 0.8 }),
        mfaEnabled: faker.datatype.boolean({ probability: 0.2 }),
        mfaSecret: faker.datatype.boolean({ probability: 0.2 })
          ? faker.string.alphanumeric(32)
          : null,
      },
    });

    // Create AuthAccount
    await prisma.authAccount.create({
      data: {
        userId: user.id,
        provider: getRandomItem([
          AuthProvider.LOCAL,
          AuthProvider.GITHUB,
          AuthProvider.GOOGLE,
        ]),
        providerId: faker.string.uuid(),
        passwordHash: '$2b$10$' + faker.string.alphanumeric(53), // bcrypt hash format
      },
    });

    // Create Candidate
    const candidate = await prisma.candidate.create({
      data: {
        userId: user.id,
        bio: faker.lorem.paragraph(),
        careerPath: 1, // DEVELOPER
      },
    });

    // Create DeveloperCandidate
    const devCandidate = await prisma.developerCandidate.create({
      data: {
        candidateId: candidate.id,
      },
    });

    // Create GithubProfile with realistic data
    const githubUsername = faker.internet.username().toLowerCase();
    await prisma.githubProfile.create({
      data: {
        devCandidateId: devCandidate.id,
        githubUsername,
        githubUserId: faker.string.numeric(8),
        encryptedToken: `v1:${faker.string.alphanumeric(16)}:${faker.string.alphanumeric(
          16
        )}:${faker.string.alphanumeric(64)}`,
        scopes: ['repo', 'read:user', 'user:email'],
        lastSyncAt: faker.date.recent(),
        syncStatus: getRandomItem(['DONE', 'PENDING', 'FAILED']),
        syncProgress: '100',
        rawDataSnapshot: {
          public_repos: faker.number.int({ min: 5, max: 150 }),
          followers: faker.number.int({ min: 0, max: 500 }),
          following: faker.number.int({ min: 0, max: 300 }),
          bio: faker.lorem.sentence(),
          company: getRandomItem([faker.company.name(), null]),
          location: faker.location.city(),
          blog: faker.datatype.boolean({ probability: 0.3 }) ? faker.internet.url() : null,
        },
      },
    });

    // Create Web3Profile for some candidates
    if (faker.datatype.boolean({ probability: 0.4 })) {
      await prisma.web3Profile.create({
        data: {
          devCandidateId: devCandidate.id,
          evmAddress: `0x${faker.string.hexadecimal({ length: 40 }).slice(2)}`,
          solanaAddress: faker.datatype.boolean({ probability: 0.3 })
            ? faker.string.alphanumeric(44)
            : null,
          verifiedContracts: faker.datatype.boolean({ probability: 0.4 })
            ? [
                {
                  chain: getRandomItem(['ethereum', 'polygon', 'arbitrum']),
                  contractAddress: `0x${faker.string.hexadecimal({ length: 40 }).slice(2)}`,
                  txHash: `0x${faker.string.hexadecimal({ length: 64 }).slice(2)}`,
                  attributionMethod: 'deploy',
                  confidence: 0.95,
                },
              ]
            : Prisma.JsonNull,
          onChainMetrics: {
            totalValue: faker.number.float({ min: 0, max: 1000000, fractionDigits: 2 }),
            txCount: faker.number.int({ min: 0, max: 5000 }),
            firstTxDate: faker.date.past().toISOString(),
            lastTxDate: faker.date.recent().toISOString(),
          },
        },
      });
    }

    candidates.push(candidate);
    console.log(`  ✓ Created candidate ${i + 1}/30 - ${email}`);
  }

  // ─── CREATE JOB POSTS ────────────────────────────────────────────
  console.log('💼 Creating 16 job posts...');

  const roleTypes = Object.values(RoleType);
  const seniorityLevels = Object.values(Seniority);
  const jobStatuses = [
    JobStatus.DRAFT,
    JobStatus.PENDING_PAYMENT,
    JobStatus.ACTIVE,
    JobStatus.CLOSED_PENDING,
    JobStatus.CLOSED,
  ];

  const jobPosts = await Promise.all(
    Array.from({ length: 16 }).map((_, index) => {
      const company = getRandomItem(companies);
      const status = getRandomItem(jobStatuses);
      const baseDate = new Date();

      return prisma.jobPost.create({
        data: {
          companyId: company.id,
          title: `${getRandomItem(['Senior', 'Mid-level', 'Junior'])} ${getRandomItem([
            'Backend Engineer',
            'Frontend Developer',
            'Full Stack Engineer',
            'Smart Contract Engineer',
            'DevOps Engineer',
            'Data Scientist',
            'ML Engineer',
            'Security Engineer',
          ])}`,
          description: faker.lorem.paragraphs(3),
          location: faker.location.city() + ', ' + faker.location.country(),
          employmentType: getRandomItem(['full-time', 'part-time', 'contract']),
          bonusAmount: faker.number.int({
            min: 5000,
            max: 100000,
          }),
          currency: getRandomItem(['USD', 'EUR', 'GBP']),
          status,
          roleType: getRandomItem(roleTypes),
          seniorityLevel: getRandomItem(seniorityLevels),
          publishedAt:
            status === JobStatus.DRAFT
              ? null
              : faker.date.past({ years: 0.5 }),
          closedAt:
            status === JobStatus.CLOSED || status === JobStatus.CLOSED_PENDING
              ? faker.date.recent()
              : null,
          createdAt: faker.date.past({ years: 1 }),
        },
      });
    })
  );
  console.log(`✅ Created ${jobPosts.length} job posts`);

  // ─── CREATE SHORTLISTS ──────────────────────────────────────────
  console.log('📋 Creating shortlist entries...');

  let shortlistCount = 0;
  for (const jobPost of jobPosts) {
    // Create 1-5 shortlist entries per job post
    const numShortlists = faker.number.int({ min: 1, max: 5 });

    for (let i = 0; i < numShortlists; i++) {
      const candidate = getRandomItem(candidates);

      try {
        await prisma.shortlist.create({
          data: {
            jobPostId: jobPost.id,
            candidateId: candidate.id,
            status: getRandomItem(['PENDING', 'REVIEWED', 'CONTACTED', 'REJECTED']),
            notes: faker.datatype.boolean({ probability: 0.6 })
              ? faker.lorem.sentence()
              : null,
            roleFitScore: faker.number.float({
              min: 0,
              max: 1,
              fractionDigits: 2,
            }),
            fraudTier: getRandomItem(Object.values(FraudTier)),
            riskLevel: getRandomItem(Object.values(RiskLevel)),
            confidenceTier: getRandomItem(Object.values(ConfidenceTier)),
            behaviorPattern: getRandomItem(Object.values(BehaviorPattern)),
            fitTier: getRandomItem(Object.values(FitTier)),
            candidateNote: faker.datatype.boolean({ probability: 0.4 })
              ? faker.lorem.sentence(10)
              : null,
            hrNotes: faker.datatype.boolean({ probability: 0.5 })
              ? faker.lorem.paragraph()
              : null,
            appliedAt: faker.date.past({ years: 0.5 }),
          },
        });

        shortlistCount++;
      } catch (error) {
        // Handle unique constraint violations gracefully
        console.log(`  ℹ️  Skipped duplicate shortlist entry`);
      }
    }
  }
  console.log(`✅ Created ${shortlistCount} shortlist entries`);

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✨ Database seeding completed successfully!');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`📊 Summary:`);
  console.log(`   • Companies: ${companies.length}`);
  console.log(`   • Users & Candidates: ${candidates.length}`);
  console.log(`   • Job Posts: ${jobPosts.length}`);
  console.log(`   • Shortlist Entries: ${shortlistCount}`);
  console.log('═══════════════════════════════════════════════════════════');
}

main()
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });