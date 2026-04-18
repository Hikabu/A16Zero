import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: '0x123...' })
  @IsString()
  @IsNotEmpty()
  walletAddress: string;

  @ApiProperty({ example: '0xabc...' })
  @IsString()
  @IsOptional()
  smartAccountAddress?: string;
}
