import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';
import { JobStatus } from '@prisma/client';
import { AppException } from '../../shared/app.exception';

@Injectable()
export class JobsService {
  constructor(private prisma: PrismaService) {}

  async create(companyId: string, dto: CreateJobDto) {
    return this.prisma.jobPost.create({
      data: {
        ...dto,
        companyId,
        status: JobStatus.DRAFT,
      },
    });
  }

  async findMyJobs(companyId: string) {
    return this.prisma.jobPost.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async publish(id: string, companyId: string) {
    const job = await this.prisma.jobPost.findUnique({ where: { id } });
    
    if (!job || job.companyId !== companyId) {
      throw new AppException('Job not found or access denied', 404);
    }

    return this.prisma.jobPost.update({
      where: { id },
      data: {
        status: JobStatus.ACTIVE,
        publishedAt: new Date(),
      },
    });
  }

  async close(id: string, companyId: string) {
    const job = await this.prisma.jobPost.findUnique({ where: { id } });
    
    if (!job || job.companyId !== companyId) {
      throw new AppException('Job not found or access denied', 404);
    }

    return this.prisma.jobPost.update({
      where: { id },
      data: {
        status: JobStatus.CLOSED,
        closedAt: new Date(),
      },
    });
  }
}
