import { ApiProperty } from '@nestjs/swagger';

class UpdateStatusDataDto {
  @ApiProperty({ example: 's1' })
  id: string;

  @ApiProperty({ example: 'ACCEPTED' })
  status: string;
}

export class UpdateShortlistResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Status updated successfully' })
  message?: string;

  @ApiProperty({ type: UpdateStatusDataDto })
  data: UpdateStatusDataDto;
}