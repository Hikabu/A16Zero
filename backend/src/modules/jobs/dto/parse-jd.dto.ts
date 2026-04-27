import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ParseJobDescriptionDto {
  @ApiProperty({
    example: 'We are looking for a Senior Backend Engineer proficient in NestJS and PostgreSQL...',
  })
  @IsString()
  @IsNotEmpty()
  jdText: string;
}
