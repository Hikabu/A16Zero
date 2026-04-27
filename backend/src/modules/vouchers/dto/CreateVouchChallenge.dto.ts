import { ApiProperty } from '@nestjs/swagger';

export class CreateVouchChallengeDto {
  @ApiProperty({
    description: 'Identifier of the candidate (username, email, or GitHub username)',
    example: 'octocat',
  })
  candidate: string;

  @ApiProperty({
    description: 'Optional endorsement message',
    example: 'Great engineer, highly recommend',
    required: false,
  })
  message?: string;
}