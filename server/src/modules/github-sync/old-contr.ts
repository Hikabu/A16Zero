import { Controller, Post, Get, Req } from '@nestjs/common';
import { GithubSyncService } from './github-sync.service';
import { VerifiedAuth } from '../../shared/decorators/verified.decorator';
import { UserRole } from '@prisma/client';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';

@ApiTags('GitHub Sync')
@ApiBearerAuth()
@Controller('me/github/sync')
export class GithubSyncController {
  constructor(private readonly githubSyncService: GithubSyncService) {}

  @VerifiedAuth(UserRole.CANDIDATE)
  @Post()
  @ApiOperation({
    summary: 'Trigger GitHub profile sync',
    description:
      'Starts a background job to fetch and analyze the authenticated user’s GitHub profile. ' +
      'This endpoint does not return results immediately, use the status endpoint to track progress.',
  })
  @ApiResponse({
    status: 201,
    description: 'Sync job successfully started',
  })
  @ApiResponse({
    status: 404,
    description: 'GitHub profile not found for user',
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit: only one sync allowed every 24 hours',
  })
  async triggerSync(@Req() req: any) {
    const user = req.authUser || req.user;
    console.log("user: ", user);
    return this.githubSyncService.triggerSync(user.id);
  }

  @VerifiedAuth(UserRole.CANDIDATE)
  @Get('status')
  @ApiOperation({
    summary: 'Get GitHub sync status',
    description:
      'Returns the current status of the GitHub sync job, including progress, errors, and last sync timestamp.',
  })
  @ApiResponse({
    status: 200,
    description: 'Current sync status returned',
  })
  @ApiResponse({
    status: 404,
    description: 'GitHub profile not found for user',
  })
  async getSyncStatus(@Req() req: any) {
    const user = req.authUser || req.user;
    return this.githubSyncService.getSyncStatus(user.id);
  }
}
