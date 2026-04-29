import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

export enum DecisionStatus {
  SHORTLISTED = 'SHORTLISTED',
  REJECTED = 'REJECTED',
  REVIEWED = 'REVIEWED',
}

export class ApplyDecisionDto {
  @ApiProperty({
    enum: DecisionStatus,
    description: 'The decision status for the application',
    example: 'SHORTLISTED',
  })
  @IsEnum(DecisionStatus)
  @IsNotEmpty()
  status: DecisionStatus;
}
