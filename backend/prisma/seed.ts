import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  try {
    // Clear existing data
    console.log("🧹 Clearing existing data...");
    await prisma.shortlist.deleteMany({});
    await prisma.talentProof.deleteMany({});
    await prisma.candidate.deleteMany({});
    await prisma.jobPost.deleteMany({});
    await prisma.company.deleteMany({});

    // companies
    console.log(" Creating companies...");
    const companies = await Promise.all(
      Array.from({ length: 5 }).map(() =>
        prisma.company.create({
          data: {
            name: faker.company.name(),
            legalName: faker.company.name(),
            registrationNumber: faker.string.alphanumeric(8).toUpperCase(),
            country: faker.location.country(),
            email: faker.internet.email(),
            isVerified: faker.datatype.boolean({ probability: 0.7 }),
            walletAddress: `0x${faker.string.hexadecimal({ length: 40 })}`,
            smartAccountAddress: `0x${faker.string.hexadecimal({ length: 40 })}`,
          },
        })
      )
    );

    console.log(`✅ Created ${companies.length} companies`);

    // job posts across companies
    console.log("Creating job posts...");
    const jobPosts = await Promise.all(
      Array.from({ length: 6 }).map(() =>
        prisma.jobPost.create({
          data: {
            companyId: faker.helpers.arrayElement(companies).id,
            title: faker.person.jobTitle(),
            description: faker.lorem.paragraphs(2),
            location: faker.location.city(),
            employmentType: faker.helpers.arrayElement([
              "full-time",
              "part-time",
              "contract",
            ]),
            bonusAmount: faker.number.float({ min: 1000, max: 50000, fractionDigits: 2 }),
            currency: "USD",
            status: faker.helpers.arrayElement(["DRAFT", "PENDING_PAYMENT", "ACTIVE"]),
            publishedAt: faker.date.recent({ days: 30 }),
          },
        })
      )
    );

    console.log(`✅ Created ${jobPosts.length} job posts`);

    // candidates
    console.log("👥 Creating candidates...");
    const candidates = await Promise.all(
      Array.from({ length: 20 }).map(() =>
        prisma.candidate.create({
          data: {
            firstName: faker.person.firstName(),
            lastName: faker.person.lastName(),
            email: faker.internet.email(),
            country: faker.location.country(),
            skills: faker.helpers.multiple(
              () => faker.person.jobType(),
              { count: { min: 3, max: 7 } }
            ),
            createdAt: faker.date.past({ years: 1 }),
          },
        })
      )
    );

    console.log(`✅ Created ${candidates.length} candidates`);

    // Create talent proofs for candidates
    console.log("🏆 Creating talent proofs...");
    const talentProofs = await Promise.all(
      candidates.flatMap((candidate) =>
        Array.from({ length: faker.number.int({ min: 1, max: 3 }) }).map(() =>
          prisma.talentProof.create({
            data: {
              candidateId: candidate.id,
              proofType: faker.helpers.arrayElement([
                "github",
                "portfolio",
                "certification",
                "work_history",
              ]),
              title: faker.lorem.sentence(),
              url: faker.internet.url(),
              verifiedBy: faker.helpers.maybe(() => faker.company.name(), {
                probability: 0.6,
              }),
              status: faker.helpers.arrayElement([
                "UNVERIFIED",
                "VERIFIED",
                "REJECTED",
              ]),
              score: faker.helpers.maybe(
                () => faker.number.float({ min: 1, max: 100, fractionDigits: 2 }),
                { probability: 0.7 }
              ),
            },
          })
        )
      )
    );

    console.log(`✅ Created ${talentProofs.length} talent proofs`);

    // Create shortlists connecting candidates to job posts
    console.log(" Creating shortlists...");
    const shortlists = await Promise.all(
      Array.from({ length: 20 }).map(() =>
        prisma.shortlist
          .create({
            data: {
              jobPostId: faker.helpers.arrayElement(jobPosts).id,
              candidateId: faker.helpers.arrayElement(candidates).id,
              matchTier: faker.helpers.arrayElement([
                "TOP_MATCH",
                "POTENTIAL_MATCH",
                "GENERAL_MATCH",
              ]),
              status: faker.helpers.arrayElement([
                "PENDING",
                "REVIEWED",
                "CONTACTED",
                "REJECTED",
              ]),
              notes: faker.helpers.maybe(() => faker.lorem.sentence(), {
                probability: 0.5,
              }),
            },
          })
          .catch((error) => {
            // Handle unique constraint violation (same candidate for same job)
            if (error.code === "P2002") {
              console.log("⚠️  Skipping duplicate shortlist entry");
              return null;
            }
            throw error;
          })
      )
    );

    const validShortlists = shortlists.filter((s) => s !== null);
    console.log(`✅ Created ${validShortlists.length} shortlists`);

    console.log("\n✨ Database seed completed successfully!");
    console.log(`
    Summary:
    - Companies: ${companies.length}
    - Job Posts: ${jobPosts.length}
    - Candidates: ${candidates.length}
    - Talent Proofs: ${talentProofs.length}
    - Shortlists: ${validShortlists.length}
    `);
  } catch (error) {
    console.error("❌ Error during seed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();