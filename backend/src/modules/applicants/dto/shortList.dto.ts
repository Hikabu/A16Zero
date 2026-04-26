import { ApiProperty } from '@nestjs/swagger';

export class ShortlistDto {
  @ApiProperty({ example: 's1' })
  id: string;

  @ApiProperty({ example: 'job_123' })
  jobPostId: string;

  @ApiProperty({ example: 'cand_456' })
  candidateId: string;

  @ApiProperty({ example: 'PENDING' })
  status: string;

  @ApiProperty({ example: 'TOP_MATCH' })
  matchTier: string;
}
