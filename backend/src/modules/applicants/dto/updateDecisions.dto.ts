import { ApiProperty } from '@nestjs/swagger';

export class UpdateDecisionDto {
  @ApiProperty({
    example: 'REVIEWED',
    description: 'New application status',
  })
  status: string;
}