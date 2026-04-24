import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { RoleType } from '@prisma/client';

export class CreateJobDto {
  @ApiProperty({ example: 'Senior NestJS Engineer' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'We are looking for a senior engineer to join our team.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 'Remote' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ example: 'Full-time' })
  @IsString()
  @IsOptional()
  employmentType?: string;

  @ApiProperty({ example: 1000 })
  @IsNumber()
  bonusAmount: number;

  @ApiProperty({ example: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ enum: RoleType, example: RoleType.BACKEND })
  @IsEnum(RoleType)
  roleType: RoleType;

  // (optional but matches schema)
  @ApiProperty({ enum: ['JUNIOR', 'MID', 'SENIOR', 'LEAD'], required: false })
  @IsOptional()
  @IsEnum(['JUNIOR', 'MID', 'SENIOR', 'LEAD'])
  seniorityLevel?: 'JUNIOR' | 'MID' | 'SENIOR' | 'LEAD';
}
