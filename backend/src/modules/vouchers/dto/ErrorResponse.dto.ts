import { ApiProperty } from '@nestjs/swagger';

/**
 * Standard Error DTO
 */
export class VoucherErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ example: 'Validation failed' })
  message: string;

  @ApiProperty({ example: 'Bad Request' })
  error: string;
}