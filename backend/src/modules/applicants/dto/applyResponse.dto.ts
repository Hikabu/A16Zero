import { ApiProperty } from '@nestjs/swagger';

export class ApplyResponseDto {
  @ApiProperty({ example: 'application_123' })
  id: string;

  @ApiProperty({ example: 'APPLIED' })
  pipelineStage: string;

  @ApiProperty({ example: 'PENDING' })
  status: string;
}