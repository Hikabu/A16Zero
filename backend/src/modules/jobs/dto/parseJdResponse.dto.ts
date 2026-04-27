import { ApiProperty } from '@nestjs/swagger';

export class ParseJdResponseDto {
  @ApiProperty({
    description: 'AI parsed structured requirements',
    example: {
      skills: ['Node.js', 'NestJS', 'PostgreSQL'],
      seniority: 'SENIOR',
      parserConfidence: 0.82,
    },
  })
  parsed: any;

  @ApiProperty({
    description: 'Whether manual review is recommended',
    example: false,
  })
  requiresReview: boolean;

  @ApiProperty({
    description: 'Diff summary of extracted requirements',
    example: {
      added: ['GraphQL'],
      removed: [],
      changedWeights: ['ownershipWeight'],
    },
  })
  diff: any;
}
