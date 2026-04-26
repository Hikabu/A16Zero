import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ConfirmVouchDto {
  @ApiProperty({
    description: 'Identifier of the candidate',
    example: 'octocat',
  })
  @IsString()
  candidateIdentifier: string;

  @ApiProperty({
    description: 'Endorsement message',
    example: 'Great engineer',
  })
  @IsString()
  message: string;

  @ApiProperty({
    description: 'Transaction signature',
    example: '5Nf7abcXYZ123...',
  })
  @IsString()
  txSignature: string;
}