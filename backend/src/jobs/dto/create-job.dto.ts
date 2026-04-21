import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateJobDto {
  @ApiProperty({ example: 'Senior NestJS Engineer' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'We are looking for a senior engineer to join our team.' })
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
}
