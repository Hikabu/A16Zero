import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JobStatus } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats(companyId: string) {
    const totalJobs = await this.prisma.jobPost.count({
      where: { companyId },
    });

    const activeJobs = await this.prisma.jobPost.count({
      where: { 
        companyId,
        status: JobStatus.ACTIVE,
      },
    });

    // Mock count for shortlisted candidates since it's a mock flow
    const totalCandidatesShortlisted = await this.prisma.shortlist.count({
      where: {
        jobPost: { companyId },
      },
    });

    return {
      totalJobs,
      activeJobs,
      totalCandidatesShortlisted,
    };
  }
}
