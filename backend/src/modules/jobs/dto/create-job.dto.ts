import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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

  @ApiProperty({ example: 'Remote', required: false })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ example: 'Full-time', required: false })
  @IsString()
  @IsOptional()
  employmentType?: string;

  @ApiProperty({ example: 1000, required: false })
  @IsNumber()
  @IsOptional()
  bonusAmount?: number;

  @ApiProperty({ example: 'USD', required: false })
  @IsString()
  @IsOptional()
  currency?: string;
}