import { ApiProperty } from '@nestjs/swagger';

export class UpdateShortlistStatusDto {
  @ApiProperty({
    example: 'ACCEPTED',
    description: 'New status of the shortlist entry',
  })
  status: string;
}