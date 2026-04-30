import { ApiProperty } from '@nestjs/swagger';
import { RoleType, Seniority, JobStatus } from '@prisma/client';

export class JobResponseDto {
  @ApiProperty({ example: 'cma9x1k2p0000qwert123' })
  id: string;

  @ApiProperty({ example: 'Senior Backend Engineer' })
  title: string;

  @ApiProperty({
    example: 'We are looking for a NestJS expert to build scalable APIs...',
  })
  description: string;

  @ApiProperty({ enum: JobStatus, example: JobStatus.ACTIVE, description: 'Job status' })
  status: JobStatus;

  @ApiProperty({ example: 'company_123' })
  companyId: string;

  @ApiProperty({ enum: RoleType, example: RoleType.BACKEND })
  roleType?: RoleType | null;

  @ApiProperty({ enum: Seniority, example: Seniority.SENIOR })
  seniorityLevel?: Seniority | null;

  @ApiProperty({ example: true })
  isWeb3Role: boolean;

  @ApiProperty({ example: '2026-04-27T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-04-27T10:00:00.000Z' })
  updatedAt: Date;
}
