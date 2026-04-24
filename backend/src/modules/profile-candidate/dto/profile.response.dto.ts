import { ApiProperty } from '@nestjs/swagger';

export class AuthAccountDto {
  @ApiProperty({ example: 'google' })
  provider: string;

  @ApiProperty({ example: '2026-01-01T12:00:00.000Z' })
  createdAt: Date;
}

export class UserProfileResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  username: string;

  @ApiProperty({ nullable: true })
  firstName: string;

  @ApiProperty({ nullable: true })
  lastName: string;

  @ApiProperty()
  role: string;

  @ApiProperty()
  accountStatus: string;

  @ApiProperty()
  isEmailVerified: boolean;

  @ApiProperty()
  mfaEnabled: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: [AuthAccountDto] })
  authAccounts: AuthAccountDto[];
}

export class CandidateProfileResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ nullable: true })
  bio: string;

  @ApiProperty()
  careerPath: number;

  @ApiProperty({ nullable: true })
  scorecard: any;

  @ApiProperty()
  createdAt: Date;
}

export class GithubConnectionResponseDto {
  @ApiProperty()
  connected: boolean;

  @ApiProperty({ nullable: true })
  github: any;
}

export class SimpleMessageResponseDto {
  @ApiProperty()
  message: string;
}
