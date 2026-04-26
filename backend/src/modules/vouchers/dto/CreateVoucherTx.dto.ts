// src/modules/vouches/dto/vouch-request.dto.ts
// Replace the existing DTO entirely.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsNotEmpty, MaxLength, IsOptional, Matches } from 'class-validator'

export class VouchDataDto {
  @ApiPropertyOptional({
    description: 'Vouch message via body (Phantom uses query param instead)',
    example: 'We built the MVP together in 3 weeks.',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  message?: string
}

export class VouchRequestDto {
  @ApiProperty({
    description:
      'Voucher wallet address (base58). ' +
      'Phantom injects this automatically. ' +
      'For Swagger testing: paste any valid Solana wallet address.',
    example: '7fZkMnPs3Q9xWvKdRtLqY2AbCdEfGhIj4KlMnOpQrSt',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, {
    message: 'account must be a valid base58 Solana wallet address',
  })
  account: string

  @ApiPropertyOptional({
    description:
      'Vouch message via body. ' +
      'If message query param is present, query param takes priority. ' +
      'Phantom sends message as query param from the href template.',
    type: VouchDataDto,
  })
  @IsOptional()
  data?: VouchDataDto
}
