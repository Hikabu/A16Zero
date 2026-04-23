import { ApiProperty } from '@nestjs/swagger';

export class CompanyJobsCountDto {
  @ApiProperty()
  jobPosts: number;
}

export class CompanyProfileResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ nullable: true })
  name?: string;

  @ApiProperty({ nullable: true })
  country?: string;

  @ApiProperty()
  walletAddress: string;

  @ApiProperty()
  smartAccountAddress: string;

  @ApiProperty()
  isVerified: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: () => CompanyJobsCountDto })
  _count: CompanyJobsCountDto;
}