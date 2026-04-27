import { ApiProperty } from '@nestjs/swagger';

export class JobResponseDto {
  @ApiProperty({ example: 'cma9x1k2p0000qwert123' })
  id: string;

  @ApiProperty({ example: 'Senior Backend Engineer' })
  title: string;

  @ApiProperty({
    example: 'We are looking for a NestJS expert to build scalable APIs...',
  })
  description: string;

  @ApiProperty({ example: 'DRAFT', description: 'Job status' })
  status: string;

  @ApiProperty({ example: 'company_123' })
  companyId: string;

  @ApiProperty({ example: '2026-04-27T10:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-04-27T10:00:00.000Z' })
  updatedAt: string;
}
