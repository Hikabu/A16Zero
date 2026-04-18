import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ScorecardService } from './scorecard.service';
import { InternalKeyGuard } from './internal-key.guard';
import { ZodResponse } from 'nestjs-zod';
import { 
  ScorecardUiDto, 
  ScorecardPreviewRequestDto, 
  ScorecardRawResponseDto 
} from './contract/scorecard.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Scorecard')
@Controller('api/scorecard')
export class ScorecardController {
  constructor(private readonly scorecardService: ScorecardService) {}

  @Post('preview')
  @ApiOperation({ 
    summary: 'Generate frontend-safe scorecard preview', 
    description: 'Computes a scorecard and returns a simplified model suitable for UI display.' 
  })
  @ZodResponse({ status: 200, type: ScorecardUiDto })
  @UseGuards(InternalKeyGuard)
  @HttpCode(HttpStatus.OK)
  async preview(@Body() request: ScorecardPreviewRequestDto): Promise<ScorecardUiDto> {
    const result = await this.scorecardService.previewForUsername(request.githubUsername, request.roleType);
    return this.scorecardService.mapToUiModel(result);
  }

  @Post('preview/raw')
  @ApiOperation({ 
    summary: 'Generate raw scorecard data', 
    description: 'Returns the full internal scoring state for debugging and deep analysis.' 
  })
  @ZodResponse({ status: 200, type: ScorecardRawResponseDto })
  @UseGuards(InternalKeyGuard)
  @HttpCode(HttpStatus.OK)
  async previewRaw(@Body() request: ScorecardPreviewRequestDto): Promise<any> {
    return this.scorecardService.previewForUsername(request.githubUsername, request.roleType);
  }
}
