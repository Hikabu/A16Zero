import {
  Controller,
  Post,
  Get,
  Req,
  Res,
  UseGuards,
  Query,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { GithubSyncService } from './github-sync.service';
import { GithubSyncConnectGuard } from '../auth-candidate/guards/github.sync.connect.guard';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('GitHub Sync')
@ApiBearerAuth()
@Controller('me/github/sync')
export class GithubSyncController {
  constructor(private readonly githubSyncService: GithubSyncService) {}

  // ─── Step 1: JWT-protected — generate state, redirect to GitHub ──
  @Get('connect')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Start GitHub connect for registered user scorecard' })
  async startConnect(@Req() req: any, @Res() res: Response) {
    // Same pattern as /auth/github/link — store userId in Redis, get OAuth URL
    const url = await this.githubSyncService.startConnect(req.user.id);
    return res.redirect(url);
  }

  // ─── Step 2: GitHub redirects back here — no JWT (it's a redirect) ─
  @Get('connect/callback')
  @UseGuards(GithubSyncConnectGuard)
  @ApiOperation({ summary: 'GitHub sync connect callback' })
  async connectCallback(
    @Req() req: any,
    @Res() res: Response,
    @Query('state') state: string,
  ) {
    // req.user = { githubId, login, accessToken, scopes } from strategy
    // userId is recovered from Redis via the state param
    await this.githubSyncService.connectGithub(req.user, state);

    return res.redirect(`${process.env.FRONTEND_URL}/dashboard/github/syncing`);
  }

  // ─── Trigger sync ────────────────────────────────────────────────
  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Fetch data from authenticated github profile, before generating scorecard' })
  async triggerSync(@Req() req: any) {
     this.githubSyncService.triggerSync(req.user.id);
  }

  // ─── Sync status ─────────────────────────────────────────────────
  @Get('status')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get sync status' })
  async getSyncStatus(@Req() req: any) {
    return this.githubSyncService.getSyncStatus(req.user.id);
  }
}