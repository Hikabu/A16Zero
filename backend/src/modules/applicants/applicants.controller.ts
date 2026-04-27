import { Controller, Get, Post, Patch, Param, Body, UseGuards, Req, Query, BadRequestException, Res } from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiParam,
  ApiQuery,
  ApiBody
} from '@nestjs/swagger';
import { BaseController } from '../../shared/base.controller';
import { CandidateListResponseDto } from './dto/candidateListResponse.dto';
import { ShortlistResponseDto } from './dto/shortListResponse.dto';
import { UpdateShortlistStatusDto } from './dto/updateStatus.dto';
import { UpdateShortlistResponseDto } from './dto/updateStatusResponse.dto';
import { ApplicantsService } from './applicants.service';
import { ScorecardRenderer } from './scorecard-renderer.service';
import { VerifiedAuth } from '../../shared/decorators/verified.decorator';
import { UserRole, PipelineStage, FitTier } from '@prisma/client';
import { JwtAuthGuard as HrAuthGuard } from '../auth-employer/guards/jwt-auth.guard';
import { ApplyResponseDto } from './dto/applyResponse.dto';
import { ErrorResponseDto } from './dto/common.dto';
import { AdvanceStageDto } from './dto/advanceStage.dto';
import { ApplicationFiltersDto } from './dto/applicationFilter.dto';

@ApiTags('Applications')
@ApiBearerAuth('Authorization')
@Controller('applications')
export class ApplicantsController extends BaseController {
  constructor(
    private readonly applicantsService: ApplicantsService,
    private readonly scorecardRenderer: ScorecardRenderer
  ) {
    super();
  }

   // ─────────────────────────────
  // CANDIDATE: GAP PREVIEW
  // ─────────────────────────────

  @Get('me/gap-preview')
  @VerifiedAuth(UserRole.CANDIDATE)
  @ApiOperation({
    summary: 'Preview gap analysis',
    description:
      'Returns gap analysis BEFORE applying.\n\n' +
      'Does not persist data.',
  })
  @ApiQuery({
    name: 'jobId',
    required: true,
    example: 'job_123',
  })
  @ApiBadRequestResponse({
    description: 'Missing jobId',
    type: ErrorResponseDto,
  })
  async getGapPreview(@Req() req: any, @Query('jobId') jobId: string) {
    if (!jobId) throw new BadRequestException('jobId is required');

    const preview = await this.applicantsService.getGapPreview(jobId, req.user.id);
    return this.handleSuccess(preview);
  }

  // ─────────────────────────────
  // APPLY (CANDIDATE)
  // ─────────────────────────────

  @Post('me/:jobId')
  @VerifiedAuth(UserRole.CANDIDATE)
  @ApiOperation({
    summary: 'Apply for a job',
    description:
      'Allows an authenticated candidate to apply for an ACTIVE job.\n\n' +
      'This triggers:\n' +
      '- Gap analysis\n' +
      '- Decision card generation\n' +
      '- Initial pipeline stage = APPLIED',
  })
  @ApiParam({
    name: 'jobId',
    description: 'Job ID',
    example: 'job_123',
  })
  @ApiCreatedResponse({
    description: 'Application submitted successfully',
    type: ApplyResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Already applied OR missing analysis',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid JWT token',
    type: ErrorResponseDto,
  })
  async apply(@Req() req: any, @Param('jobId') jobId: string) {
    const application = await this.applicantsService.apply(jobId, req.user.id);
    return this.handleCreated(application, 'Application submitted successfully');
  }

    // ─────────────────────────────
  // CANDIDATE: MY APPLICATIONS
  // ─────────────────────────────

  @Get('me')
  @VerifiedAuth(UserRole.CANDIDATE)
  @ApiOperation({
    summary: 'Get my applications',
    description:
      'Returns candidate applications with human-readable pipeline stages.',
  })
  async getMyApplications(@Req() req: any) {
    const list = await this.applicantsService.findCandidateApplications(req.user.id);
    return this.handleSuccess(list);
  }

  // ─────────────────────────────
  // HR: LIST APPLICATIONS
  // ─────────────────────────────

  @Get('hr/jobs/:jobId')
  @UseGuards(HrAuthGuard)
  @ApiOperation({
    summary: 'List job applications (HR)',
    description:
      'Returns all applications for a job including:\n' +
      '- HR decision view\n' +
      '- Technical evaluation\n' +
      '- Candidate info\n\n' +
      'Supports filtering.',
  })
  @ApiParam({
    name: 'jobId',
    example: 'job_123',
  })
  @ApiQuery({
    name: 'fitTier',
    required: false,
    enum: FitTier,
    example: 'STRONG',
  })
  @ApiQuery({
    name: 'minScore',
    required: false,
    example: 70,
  })
  @ApiQuery({
    name: 'pipelineStage',
    required: false,
    enum: PipelineStage,
  })
  @ApiOkResponse({
    description: 'Applications retrieved successfully',
  })
  async getJobApplications(
    @Req() req: any,
    @Param('jobId') jobId: string,
    @Query() filters: ApplicationFiltersDto
  ) {
    const list = await this.applicantsService.findByJob(jobId, req.user.id, filters);
    return this.handleSuccess(list);
  }

  // ─────────────────────────────
  // HR: APPLICATION DETAIL
  // ─────────────────────────────

  @Get('hr/:appId')
  @UseGuards(HrAuthGuard)
  @ApiOperation({
    summary: 'Get application FULL details',
    description:
      'Returns full application data including:\n' +
      '- Decision card\n' +
      '- Gap report\n' +
      '- Candidate profiles\n' +
      '- Interview questions',
  })
  @ApiParam({
    name: 'appId',
    example: 'app_123',
  })
  @ApiOkResponse({
    description: 'Application details retrieved',
  })
  @ApiNotFoundResponse({
    description: 'Application not found',
    type: ErrorResponseDto,
  })
  async getApplicationDetail(@Req() req: any, @Param('appId') appId: string) {
    const detail = await this.applicantsService.findById(appId, req.user.id);
    return this.handleSuccess(detail);
  }

  // ─────────────────────────────
  // HR: ADVANCE STAGE
  // ─────────────────────────────
  @Patch('hr/:appId/stage')
  @UseGuards(HrAuthGuard)
  @ApiOperation({
    summary: 'Advance pipeline stage',
    description:
      'Moves candidate forward in hiring pipeline.\n\n' +
      'Validates transitions and may generate interview questions.',
  })
  @ApiParam({ name: 'appId', example: 'app_123' })
  @ApiBody({ type: AdvanceStageDto })
  @ApiOkResponse({ description: 'Stage updated successfully' })
  async advanceApplicationStage(
    @Req() req: any,
    @Param('appId') appId: string,
    @Body() body: AdvanceStageDto
  ) {
    const updated = await this.applicantsService.advanceStage(
      appId,
      req.user.id,
      body.stage,
      body.note
    );

    return this.handleSuccess(updated, 'Pipeline stage advanced');
  }


  // ─────────────────────────────
  // HR: INTERVIEW QUESTIONS
  // ─────────────────────────────

  @Get('hr/:appId/interview-questions')
  @UseGuards(HrAuthGuard)
  @ApiOperation({
    summary: 'Get interview questions',
    description:
      'Returns generated interview questions.\n\n' +
      'Optional:\n' +
      '- Filter by stage\n' +
      '- Defaults to latest set',
  })
  @ApiParam({ name: 'appId', example: 'app_123' })
  @ApiQuery({
    name: 'stage',
    required: false,
    enum: PipelineStage,
  })
  async getInterviewQuestions(
    @Req() req: any,
    @Param('appId') appId: string,
    @Query('stage') stage?: string
  ) {
    const app = await this.applicantsService.findById(appId, req.user.id);

    const rawApp = await this.applicantsService['prisma'].shortlist.findUnique({
      where: { id: appId },
      select: { interviewQuestions: true }
    });

    const interviewQuestions = (rawApp as any)?.interviewQuestions || [];

    if (!interviewQuestions.length) {
      return this.handleSuccess({ questionsFound: false });
    }

    if (stage) {
      const match = interviewQuestions.find((q: any) => q.stage === stage);
      if (match) return this.handleSuccess(match);
    }

    return this.handleSuccess(interviewQuestions[interviewQuestions.length - 1]);
  }
 
}