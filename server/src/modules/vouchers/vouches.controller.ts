import {
  Controller,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { VouchesService, ConfirmVouchInput } from './vouches.service';

export interface RevokeVouchBody {
  voucherWallet: string;
  signedMessage: string;
}

@Controller('vouch')
export class VouchesController {
  constructor(private readonly vouchesService: VouchesService) {}

  /**
   * POST /api/vouch/confirm
   * Anchors a new vouch.
   */
  @Post('confirm')
  async confirmVouch(@Body() body: ConfirmVouchInput) {
    return this.vouchesService.confirmVouch(body);
  }

  /**
   * DELETE /api/vouch/:id
   * Revokes an existing vouch.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeVouch(
    @Param('id') id: string,
    @Body() body: RevokeVouchBody,
  ) {
    await this.vouchesService.revokeVouch(
      id,
      body.voucherWallet,
      body.signedMessage,
    );
  }
}
