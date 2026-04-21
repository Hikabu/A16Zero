import { ApiProperty } from '@nestjs/swagger';

export class CreateAnalysisDto {
@ApiProperty({
    example: 'arturo-clavero',
  })
  githubUsername: string;
}

export class RecomputeAnalysisDto {
    @ApiProperty({
    example: 'arturo-clavero',
  })
  githubUsername: string;
  @ApiProperty({
    example: true,
    required: false,
  })

  force?: boolean;
}