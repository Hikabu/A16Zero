import { Controller, Get, Post, Param, Body, Query, Res, HttpCode, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiParam, ApiOkResponse } from '@nestjs/swagger';
import { PublicKey } from '@solana/web3.js';
import { VouchesService } from './vouches.service';

@ApiTags('Solana Blinks')
@Controller('api/actions')
export class ActionsController {
  constructor(
    private readonly config: ConfigService,
    private readonly vouchesService: VouchesService,
  ) {}

  @Get('vouch/:username')
  @ApiOperation({
    summary: 'Get Blink Card for vouching',
    description: 'Returns the Solana Action metadata for rendering a vouch card in wallets.',
  })
  @ApiParam({ name: 'username', description: 'GitHub username to vouch for' })
  @ApiOkResponse({ description: 'Blink card metadata' })
  getBlinkCard(
    @Param('username') username: string,
    @Res() res: Response
  ): void {
    res.setHeader('Content-Type', 'application/json');
    res.json({
      icon: this.config.get('VOUCH_ICON_URL'),
      title: `Vouch for ${username}`,
      description: "Cryptographically verify this developer's work. Costs ~$0.0002.",
      label: "Vouch",
      links: {
        actions: [{
          label: "Submit Vouch",
          href: `${this.config.get('APP_BASE_URL')}/api/actions/vouch/${username}?message={message}`,
          parameters: [{
            name: "message",
            label: "What did you build or work on together? (max 200 chars)",
            required: true
          }]
        }]
      }
    });
  }

  @Post('vouch/:username')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request vouch transaction',
    description: 'Returns an unsigned serialized Solana transaction for the voucher to sign.',
  })
  async getBlinkTransaction(
    @Param('username') username: string,
    @Query('message') messageFromQuery: string,
    @Body() body: { account: string; data?: { message?: string } },
    @Res() res: Response,
  ): Promise<void> {
    // Resolve message — Phantom sends as query param via href template
    const raw = (messageFromQuery ?? body?.data?.message ?? '').trim();
    const message = raw
      .replace(/<[^>]*>/g, '')
      .slice(0, 200)
      .trim();

    if (!message) {
      res.status(400).json({ message: 'Vouch message required' });
      return;
    }

    // Validate voucher wallet
    if (!body?.account) {
      res.status(400).json({ message: 'account (wallet address) required' });
      return;
    }

    try {
      new PublicKey(body.account);
    } catch {
      res.status(400).json({ message: 'Invalid wallet address' });
      return;
    }

    const txBase64 = await this.vouchesService.buildVouchTransaction(
      username,
      body.account,
      message,
    );

    res.setHeader('Content-Type', 'application/json');
    res.json({
      transaction: txBase64,
      message: `Your vouch for ${username} will be recorded on Solana`,
    });
  }
}
