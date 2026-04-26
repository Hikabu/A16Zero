import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateCandidateDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  careerPath?: number;
}
