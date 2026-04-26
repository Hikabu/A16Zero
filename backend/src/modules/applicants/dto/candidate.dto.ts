import { ApiProperty } from '@nestjs/swagger';

export class CandidateDto {
  @ApiProperty({ example: '1', description: 'Candidate unique identifier' })
  id: string;

  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;

  @ApiProperty({ example: 'john@example.com' })
  email: string;

  @ApiProperty({
    example: ['NestJS', 'TypeScript'],
    description: 'List of candidate skills',
  })
  skills: string[];
}
