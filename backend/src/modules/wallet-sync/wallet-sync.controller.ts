import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WalletSyncService } from './wallet-sync.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Wallet Sync')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('sync/wallet')
export class WalletSyncController {
  constructor(private readonly walletSyncService: WalletSyncService) {}

  @Get('challenge')
  @ApiOperation({ summary: 'Generate a wallet linking challenge' })
  async getChallenge(@Req() req: any) {
    const challenge = await this.walletSyncService.generateChallenge(
      req.user.id,
    );
    return { challenge };
  }

  @Post()
  @ApiOperation({ summary: 'Verify signature and link wallet' })
  async linkWallet(
    @Req() req: any,
    @Body() body: { walletAddress: string; signature: string },
  ) {
    return this.walletSyncService.linkWallet(
      req.user.id,
      body.walletAddress,
      body.signature,
    );
  }
}
