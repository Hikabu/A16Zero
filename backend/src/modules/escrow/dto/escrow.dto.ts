import { IsNotEmpty, IsString, IsUUID, Matches } from 'class-validator';

const UINT64_PATTERN = /^(0|[1-9][0-9]*)$/;
const BASE58_PATTERN = /^[1-9A-HJ-NP-Za-km-z]+$/;

export class ConfirmFundedDto {
  @IsUUID()
  jobPostId: string;

  @IsString()
  @Matches(UINT64_PATTERN)
  escrowId: string;

  @IsString()
  @IsNotEmpty()
  @Matches(BASE58_PATTERN)
  escrowAddress: string;

  @IsString()
  @Matches(UINT64_PATTERN)
  expectedAmount: string;
}

export class SetCandidateDto {
  @IsUUID()
  jobPostId: string;

  @IsString()
  @IsNotEmpty()
  @Matches(BASE58_PATTERN)
  candidateWallet: string;
}

export class ConfirmResolvedDto {
  @IsUUID()
  jobPostId: string;
}
