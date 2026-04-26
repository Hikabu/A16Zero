import { ApiProperty } from '@nestjs/swagger';

export class CreateScorecardJobDto {
  @ApiProperty({
    example: 'arturo-clavero',
    description: 'GitHub username to evaluate',
  })
  githubUsername: string;
}

export class RecomputeScorecardJobDto {
  @ApiProperty({
    example: 'arturo-clavero',
  })
  githubUsername: string;

  @ApiProperty({
    example: true,
    required: false,
    description: 'Force recompute even if cache exists',
  })
  force?: boolean;
}
