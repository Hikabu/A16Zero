import { Controller, Post, Get, Body, UseGuards, HttpCode, Request, HttpStatus, NotFoundException, Param } from '@nestjs/common';
import { ScorecardService } from './scorecard.service';
import { InternalKeyGuard } from './internal-key.guard';
import { ZodResponse } from 'nestjs-zod';
import { 
  ScorecardUiDto, 
  ScorecardRawResponseDto 
} from './contract/scorecard.dto';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { VerifiedAuth } from 'src/shared/decorators/verified.decorator';
import { RawScorecard } from './contract/scorecard.schema';

@ApiTags('Scorecard')
@Controller('api/scorecard')
export class ScorecardController {
  constructor(private readonly scorecardService: ScorecardService) {}

  @ApiHeader({
  name: 'X-Internal-Key',
  description: 'Internal API key',
  required: true,
})
  @Post('mock/preview')
  @ApiOperation({ 
    summary: 'Generate mock frontend-safe scorecard preview', 
    description: 'Computes a mock scorecard and returns a simplified model suitable for UI display. Requires real username, and correct github token' 
  })
  @ZodResponse({ status: 200, type: ScorecardUiDto })
  @UseGuards(InternalKeyGuard)
  @HttpCode(HttpStatus.OK)
  async preview(@Body() request): Promise<ScorecardUiDto> {
    console.log("previewing ", request.githubUsername);
    const result = await this.scorecardService.previewForUsername(request.githubUsername);
    console.log("mapping....");
    return this.scorecardService.mapToUiModel(result as unknown as RawScorecard);
  }

  @ApiHeader({
  name: 'X-Internal-Key',
  description: 'Internal API key',
  required: true,
})
  @Post('mock/preview/raw')
  @ApiOperation({ 
    summary: 'Generate mock raw scorecard data', 
    description: 'Returns mock full internal scoring state for debugging and deep analysis. Requres real username, and correct github token' 
  })
  @ZodResponse({ status: 200, type: ScorecardRawResponseDto })
  @UseGuards(InternalKeyGuard)
  @HttpCode(HttpStatus.OK)
  async previewRaw(@Body() request): Promise<any> {
    return this.scorecardService.previewForUsername(request.githubUsername);
  }

  @VerifiedAuth()
  @Get('me')
  async getMyScorecard(@Request() req) {
    const scorecard = await this.scorecardService.getScorecardForUser(req.user.id);

    if (!scorecard) {
      throw new NotFoundException(
        'No scorecard found. Trigger a sync first via POST /me/github/sync',
      );
    }
    return this.scorecardService.mapToUiModel(scorecard);
  }

  @Get(':username')
  async getPublicScorecard(@Param('username') username: string) {
    const scorecard = await this.scorecardService.getScorecardFromCache(username);

    if (!scorecard) {
      throw new NotFoundException(
        `No cached scorecard for ${username}. Trigger an analysis via POST /api/analysis`,
      );
    }
    return this.scorecardService.mapToUiModel(scorecard);
  }

   @VerifiedAuth()
  @Get('me/raw')
  async getMyScorecardRaw(@Request() req) {
    const scorecard = await this.scorecardService.getScorecardForUser(req.user.id);

    if (!scorecard) {
      throw new NotFoundException(
        'No scorecard found. Trigger a sync first via POST /me/github/sync',
      );
    }
    return scorecard;
  }

  @Get(':username/raw')
  async getPublicScorecardRaw(@Param('username') username: string) {
    const scorecard = await this.scorecardService.getScorecardFromCache(username);

    if (!scorecard) {
      throw new NotFoundException(
        `No cached scorecard for ${username}. Trigger an analysis via POST /api/analysis`,
      );
    }

    return scorecard;
  }
}
