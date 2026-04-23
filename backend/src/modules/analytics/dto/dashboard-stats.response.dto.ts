import { ApiProperty } from '@nestjs/swagger';

class DashboardStatsDto {
  @ApiProperty({
    description: 'Total number of jobs created by the company',
    example: 25,
  })
  totalJobs: number;

  @ApiProperty({
    description: 'Number of currently active job postings',
    example: 10,
  })
  activeJobs: number;

  @ApiProperty({
    description: 'Total number of shortlisted candidates across all jobs',
    example: 42,
  })
  totalCandidatesShortlisted: number;
}

export class DashboardStatsResponseDto {
  @ApiProperty({
    description: 'Indicates if the request was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Dashboard statistics payload',
    type: DashboardStatsDto,
  })
  data: DashboardStatsDto;
}