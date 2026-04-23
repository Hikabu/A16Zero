import { ApiProperty } from '@nestjs/swagger';
import { CandidateDto } from './candidate.dto';

export class CandidateListResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [CandidateDto] })
  data: CandidateDto[];
}