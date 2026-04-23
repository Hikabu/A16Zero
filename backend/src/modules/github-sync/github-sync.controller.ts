import { Controller, Post, Get, Req } from '@nestjs/common';
import { GithubSyncService } from './github-sync.service';
import { VerifiedAuth } from '../../shared/decorators/verified.decorator';
import { UserRole } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Me')
@Controller('me/github/sync')
export class GithubSyncController {
  constructor(private readonly githubSyncService: GithubSyncService) {}

  @VerifiedAuth(UserRole.CANDIDATE)
  @Post()
  async triggerSync(@Req() req: any) {
    // req.user or req.authUser is set by guards
    const user = req.authUser || req.user;
    return this.githubSyncService.triggerSync(user.id);
  }

  @VerifiedAuth(UserRole.CANDIDATE)
  @Get('status')
  async getSyncStatus(@Req() req: any) {
    const user = req.authUser || req.user;
    return this.githubSyncService.getSyncStatus(user.id);
  }
}
