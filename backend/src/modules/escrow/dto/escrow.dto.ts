import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, Matches } from 'class-validator';

const UINT64_PATTERN = /^(0|[1-9][0-9]*)$/;
const BASE58_PATTERN = /^[1-9A-HJ-NP-Za-km-z]+$/;

export class ConfirmFundedDto {
  @ApiProperty({
    description: 'Job post whose on-chain escrow was funded by the employer.',
    example: '8d4fa8cc-7df5-4f0f-91a2-bc1a9b2b7c11',
    format: 'uuid',
  })
  @IsUUID()
  jobPostId: string;

  @ApiProperty({
    description: 'Program escrow id as an unsigned 64-bit integer string.',
    example: '42',
    pattern: UINT64_PATTERN.source,
  })
  @IsString()
  @Matches(UINT64_PATTERN)
  escrowId: string;

  @ApiProperty({
    description: 'Derived escrow PDA funded on-chain.',
    example: '7eJ8hYqH6q6Gdfrb2uP83L6eJrwGQXSjQ2E6H6n8ZCwK',
    pattern: BASE58_PATTERN.source,
  })
  @IsString()
  @IsNotEmpty()
  @Matches(BASE58_PATTERN)
  escrowAddress: string;

  @ApiProperty({
    description:
      'Expected funded amount in token base units. Must be positive and divisible by 100.',
    example: '250000000',
    pattern: UINT64_PATTERN.source,
  })
  @IsString()
  @Matches(UINT64_PATTERN)
  expectedAmount: string;
}

export class SetCandidateDto {
  @ApiProperty({
    description: 'Funded job post that should receive a candidate wallet.',
    example: '8d4fa8cc-7df5-4f0f-91a2-bc1a9b2b7c11',
    format: 'uuid',
  })
  @IsUUID()
  jobPostId: string;

  @ApiProperty({
    description: 'Candidate Solana wallet recorded by the on-chain escrow.',
    example: 'GkYqf7H9jFQpMe6TNz6N6BZkdn4xB8oVeDxXM7dRrM2p',
    pattern: BASE58_PATTERN.source,
  })
  @IsString()
  @IsNotEmpty()
  @Matches(BASE58_PATTERN)
  candidateWallet: string;
}

export class ConfirmResolvedDto {
  @ApiProperty({
    description: 'Job post whose escrow resolution was observed on-chain.',
    example: '8d4fa8cc-7df5-4f0f-91a2-bc1a9b2b7c11',
    format: 'uuid',
  })
  @IsUUID()
  jobPostId: string;
}
