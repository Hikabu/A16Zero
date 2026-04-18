import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ScorecardService } from './scorecard.service';
import { InternalKeyGuard } from './internal-key.guard';
import { PreviewRequestDto, ScorecardResult } from './scorecard.types';

@Controller('api/scorecard')
export class ScorecardController {
  constructor(private readonly scorecardService: ScorecardService) {}

  @Post('preview')
  @UseGuards(InternalKeyGuard)
  @HttpCode(HttpStatus.OK)
  async preview(@Body() request: PreviewRequestDto): Promise<ScorecardResult> {
    return this.scorecardService.previewForUsername(request.githubUsername, request.roleType);
  }
}
