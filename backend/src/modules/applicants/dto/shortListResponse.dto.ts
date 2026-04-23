import { ApiProperty } from '@nestjs/swagger';
import { ShortlistDto } from './shortList.dto';

export class ShortlistResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Candidate shortlisted successfully' })
  message?: string;

  @ApiProperty({ type: ShortlistDto })
  data: ShortlistDto;
}