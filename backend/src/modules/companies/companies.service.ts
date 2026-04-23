import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CompaniesService {
  constructor(private prisma: PrismaService) {}

  async findOne(id: string) {
    return this.prisma.company.findUnique({
      where: { id },
      include: {
        _count: {
          select: { jobPosts: true },
        },
      },
    });
  }
}
