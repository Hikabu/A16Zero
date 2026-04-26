import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO: Vouch
 */
export class VouchResponseDto {
  @ApiProperty({ example: 'vouch_123' })
  id: string;

  @ApiProperty({ example: 'candidate_456' })
  candidateId: string;

  @ApiProperty({ example: '9xQeWvG816bUx9EP...' })
  voucherWallet: string;

  @ApiProperty({ example: 'Great engineer, highly recommend' })
  message: string;

  @ApiProperty({ example: '5Nf7...abc' })
  txSignature: string;

  @ApiProperty({
    description: 'Quality weight of the voucher',
    example: 'verified',
  })
  weight: 'verified' | 'standard' | 'new';

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({
    example: '2026-04-23T10:00:00.000Z',
  })
  confirmedAt: string;

  @ApiProperty({
    example: '2026-10-20T10:00:00.000Z',
  })
  expiresAt: string;
}
