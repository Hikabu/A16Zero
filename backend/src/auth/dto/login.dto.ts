import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'privy_access_token_abc_123',
    description: 'Access token received from Privy frontend SDK',
  })
  @IsNotEmpty()
  @IsString()
  privy_access_token: string;
}

export class AuthResponseDto {
  @ApiProperty()
  access_token: string;

  @ApiProperty()
  company: {
    id: string;
    name: string;
    walletAddress: string;
  };
}
