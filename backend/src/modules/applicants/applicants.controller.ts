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

@ApiTags('Applicants')
@ApiBearerAuth()
@Controller('applicants')
export class ApplicantsController extends BaseController {
  constructor(
    private readonly applicantsService: ApplicantsService,
    private readonly scorecardRenderer: ScorecardRenderer
  ) {
    super();
  }

  /**
   * POST /applicants/apply/:jobId
   */
  @Post('apply/:jobId')
  @VerifiedAuth(UserRole.CANDIDATE)
  @ApiOperation({
    summary: 'Apply for a job',
    description: 'Allows a candidate to apply for an active job. Triggers gap analysis and decision card generation.',
  })
  @ApiParam({
    name: 'jobId',
    required: true,
    description: 'ID of the job to apply for',
  })
  @ApiCreatedResponse({ description: 'Application submitted successfully' })
  @ApiBadRequestResponse({ description: 'Already applied or no completed analysis' })
  async apply(@Req() req: any, @Param('jobId') jobId: string) {
    const application = await this.applicantsService.apply(jobId, req.user.id);
    return this.handleCreated(application, 'Application submitted successfully');
  }

  /**
   * GET /candidates
   */
  @Get()
  @ApiOperation({
    summary: 'Get all candidates (Mock)',
    description: `
  Returns a list of all available candidates.
  
  This endpoint is currently mocked and is intended for frontend development and testing.
  
  Requires authentication.
  
  Authorization:
  Authorization: Bearer <token>
	  `,
  })
  @ApiOkResponse({
    description: 'Candidates retrieved successfully',
    type: CandidateListResponseDto,
    schema: {
      example: {
        success: true,
        data: [
          {
            id: '1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            skills: ['NestJS', 'TypeScript'],
          },
        ],
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  async getAll(): Promise<CandidateListResponseDto> {
    return this.handleSuccess([
      {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        skills: ['NestJS', 'TypeScript'],
      },
      {
        id: '2',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        skills: ['React', 'Solidity'],
      },
    ]);
  }

  /**
   * POST /candidates/shortlist/:jobId/:candidateId
   */
  @Post('shortlist/:jobId/:candidateId')
  @ApiOperation({
    summary: 'Shortlist a candidate for a job (Mock)',
    description: `
  Shortlists a candidate for a specific job posting.
  
  This creates a shortlist record linking a candidate to a job.
  
  Requires authentication.
	  `,
  })
  @ApiParam({
    name: 'jobId',
    type: String,
    required: true,
    description: 'ID of the job posting',
    example: 'job_123',
  })
  @ApiParam({
    name: 'candidateId',
    type: String,
    required: true,
    description: 'ID of the candidate',
    example: 'cand_456',
  })
  @ApiCreatedResponse({
    description: 'Candidate shortlisted successfully',
    type: ShortlistResponseDto,
    schema: {
      example: {
        success: true,
        message: 'Candidate shortlisted successfully',
        data: {
          id: 's1',
          jobPostId: 'job_123',
          candidateId: 'cand_456',
          status: 'PENDING',
          matchTier: 'TOP_MATCH',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input',
    schema: {
      example: {
        statusCode: 400,
        message: 'Validation failed',
        error: 'Bad Request',
      },
    },
  })
  async shortlist(
    @Param('jobId') jobId: string,
    @Param('candidateId') candidateId: string,
  ): Promise<ShortlistResponseDto> {
    return this.handleSuccess(
      {
        id: 's1',
        jobPostId: jobId,
        candidateId,
        status: 'PENDING',
        matchTier: 'TOP_MATCH',
      },
      'Candidate shortlisted successfully',
    );
  }

  /**
   * PATCH /candidates/shortlist/:id/status
   */
  @Patch('shortlist/:id/status')
  @ApiOperation({
    summary: 'Update shortlist status (Mock)',
    description: `
  Updates the status of a shortlisted candidate.
  
  Typical statuses:
  - PENDING
  - ACCEPTED
  - REJECTED
  
  Requires authentication.
	  `,
  })
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
    description: 'Shortlist record ID',
    example: 's1',
  })
  @ApiOkResponse({
    description: 'Shortlist status updated successfully',
    type: UpdateShortlistResponseDto,
    schema: {
      example: {
        success: true,
        message: 'Status updated successfully',
        data: {
          id: 's1',
          status: 'ACCEPTED',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid status value',
    schema: {
      example: {
        statusCode: 400,
        message: 'Validation failed',
        error: 'Bad Request',
      },
    },
  })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateShortlistStatusDto,
  ): Promise<UpdateShortlistResponseDto> {
    return this.handleSuccess(
      {
        id,
        status: body.status,
      },
      'Status updated successfully',
    );
  }

  // --------------------------------------------------------
  // STAGE 4 HR DECISION ENDPOINTS
  // --------------------------------------------------------

  @Get('hr/jobs/:jobId/applications')
  @UseGuards(HrAuthGuard)
  @ApiOperation({
    summary: 'List applications for a job (HR View)',
    description: 'Returns all applications, including frozen decision cards (HR & Technical views).',
  })
  async getJobApplications(
    @Req() req: any, 
    @Param('jobId') jobId: string,
    @Body() filters: { fitTier?: FitTier, minScore?: number, pipelineStage?: PipelineStage }
  ) {
    const list = await this.applicantsService.findByJob(jobId, req.user.id, filters);
    return this.handleSuccess(list);
  }

  @Get('hr/applications/:appId')
  @UseGuards(HrAuthGuard)
  @ApiOperation({
    summary: 'Get application details (HR View)',
    description: 'Returns full application details including frozen gap report and raw candidate metrics.',
  })
  async getApplicationDetail(@Req() req: any, @Param('appId') appId: string) {
    const detail = await this.applicantsService.findById(appId, req.user.id);
    return this.handleSuccess(detail);
  }

  @Get('hr/applications/:appId/interview-questions')
  @UseGuards(HrAuthGuard)
  @ApiOperation({
    summary: 'Get generated interview questions for an application',
    description: 'Returns the InterviewQuestionSet for the specified stage, or the most recent one.',
  })
  async getInterviewQuestions(
    @Req() req: any,
    @Param('appId') appId: string,
    @Query('stage') stage?: string
  ) {
    // 1. Ownership check (throws if not authorized)
    const app = await this.applicantsService.findById(appId, req.user.id);
    
    // We cannot use 'app' directly as we suppressed the raw array in findById, so fetch the single field
    const rawApp = await this.applicantsService['prisma'].shortlist.findUnique({
      where: { id: appId },
      select: { interviewQuestions: true }
    });
    
    const interviewQuestions = (rawApp as any)?.interviewQuestions || [];
    if (!Array.isArray(interviewQuestions) || !interviewQuestions.length) {
      return this.handleSuccess({ questionsFound: false });
    }

    if (stage) {
      const match = interviewQuestions.find((q: any) => q.stage === stage);
      if (match) return this.handleSuccess(match);
    }
    
    // Return last generated set if no stage requested or stage not found
    return this.handleSuccess(interviewQuestions[interviewQuestions.length - 1]);
  }

  @Get('hr/applications/:appId/scorecard')
  @UseGuards(HrAuthGuard)
  @ApiOperation({
    summary: 'Get renderable HTML Decision Scorecard',
    description: 'Returns native HTML for PDF printing without dependencies.',
  })
  async getHtmlScorecard(
    @Req() req: any, 
    @Param('appId') appId: string,
    @Res() res: Response
  ) {
    const detail = await this.applicantsService.findById(appId, req.user.id);
    const html = this.scorecardRenderer.render(detail);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }

  @Patch('hr/applications/:appId/decision')
  @UseGuards(HrAuthGuard)
  @ApiOperation({
    summary: 'Update application decision',
    description: 'Transitions application status (e.g. REVIEWED, INTERVIEW_HR, REJECTED).',
  })
  async updateApplicationDecision(
    @Req() req: any,
    @Param('appId') appId: string,
    @Body() body: { status: string }
  ) {
    const updated = await this.applicantsService.updateDecision(appId, req.user.id, body.status);
    return this.handleSuccess(updated, 'Application status updated');
  }

  @Patch('hr/applications/:appId/stage')
  @UseGuards(HrAuthGuard)
  @ApiOperation({
    summary: 'Advance application pipeline stage',
    description: 'Validates forward progression of candidate pipeline stage.',
  })
  async advanceApplicationStage(
    @Req() req: any,
    @Param('appId') appId: string,
    @Body() body: { stage: PipelineStage; note?: string }
  ) {
    const updated = await this.applicantsService.advanceStage(appId, req.user.id, body.stage, body.note);
    return this.handleSuccess(updated, 'Pipeline stage advanced');
  }

  // --------------------------------------------------------
  // STAGE 4 CANDIDATE DASHBOARD
  // --------------------------------------------------------

  @Get('me/applications')
  @VerifiedAuth(UserRole.CANDIDATE)
  @ApiOperation({
    summary: 'List own applications (Candidate View)',
    description: 'Returns applications with mapped human-readable stage descriptions.',
  })
  async getMyApplications(@Req() req: any) {
    const list = await this.applicantsService.findCandidateApplications(req.user.id);

    const stageMap: Record<string, string> = {
      APPLIED: 'Application received',
      REVIEWED: 'Under review',
      INTERVIEW_HR: 'HR interview',
      INTERVIEW_TECHNICAL: 'Technical interview',
      INTERVIEW_FINAL: 'Final interview',
      OFFER: 'Offer extended',
      HIRED: 'Hired',
      REJECTED: 'Not progressing',
    };

    const mapped = list.map(app => ({
      ...app,
      pipelineStage: stageMap[app.pipelineStage as string] || app.pipelineStage
    }));

    return this.handleSuccess(mapped);
  }

  @Get('me/gap-preview')
  @VerifiedAuth(UserRole.CANDIDATE)
  @ApiOperation({
    summary: 'Preview gap analysis before applying',
    description: 'Computes a live gap analysis without saving it. Probe questions are stripped.',
  })
  async getGapPreview(@Req() req: any, @Query('jobId') jobId: string) {
    if (!jobId) {
      throw new BadRequestException('jobId is required');
    }
    const preview = await this.applicantsService.getGapPreview(jobId, req.user.id);
    return this.handleSuccess(preview);
  }
}
