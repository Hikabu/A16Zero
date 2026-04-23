import { ApiProperty } from '@nestjs/swagger';

/**
 * Request DTO: Confirm Vouch
 */
export class ConfirmVouchDto {
  @ApiProperty({
    description:
      'Identifier of the candidate being vouched for (GitHub username or platform username)',
    example: 'octocat',
  })
  candidateIdentifier: string;

  @ApiProperty({
    description: 'Solana wallet address of the person giving the vouch',
    example: '9xQeWvG816bUx9EPf9z...',
  })
  voucherWallet: string;

  @ApiProperty({
    description: 'Human-readable endorsement message',
    example: 'Excellent smart contract engineer with strong security mindset',
  })
  message: string;

  @ApiProperty({
    description:
      'On-chain transaction signature that contains the memo matching the message',
    example: '5Nf7abcXYZ123...',
  })
  txSignature: string;
}
