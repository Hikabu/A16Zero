import { ApiProperty } from '@nestjs/swagger';

export class JobQueueResponseDto {
  @ApiProperty({ example: '12345', description: 'BullMQ job ID' })
  jobId: string;
}

export class JobStatusResponseDto {
  @ApiProperty({ example: 'pending' })
  status: string;

  @ApiProperty({ example: 'queued' })
  stage: string;

  @ApiProperty({ example: 45 })
  progress: number;

  @ApiProperty({ example: null, required: false })
  failureReason?: string;
}

export class JobResultResponseDto {
  @ApiProperty({ example: 'completed' })
  status: string;

  @ApiProperty({ example: 100 })
  progress: number;

  @ApiProperty({
    description: 'Final computed analysis result',
    example: { summary: 'Strong backend engineer...' },
    required: false,
  })
  result?: any;

  @ApiProperty({
    example: 'Some error occurred',
    required: false,
  })
  error?: string;
}

export class AnalysisErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ example: 'Validation failed' })
  message: string;

  @ApiProperty({ example: 'Bad Request' })
  error: string;
}
