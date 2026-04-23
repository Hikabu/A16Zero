import { ApiProperty } from '@nestjs/swagger';

/**
 * Request DTO: Revoke Vouch
 */
export class RevokeVouchDto {
  @ApiProperty({
    description: 'Wallet address of the original voucher',
    example: '9xQeWvG816bUx9EPf9z...',
  })
  voucherWallet: string;

  @ApiProperty({
    description:
      'Signed message proving ownership. Must sign: "revoke-vouch:<vouchId>"',
    example: '3f8k2sdf...base58signature',
  })
  signedMessage: string;
}
