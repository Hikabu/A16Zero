import { Controller, Post, Get, Body, Param, Req, UseGuards, UsePipes, Logger } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiParam,
} from '@nestjs/swagger';

import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { ParseJobDescriptionDto } from './dto/parse-jd.dto';
import { ParsedJobRequirementsDto, ParsedJobRequirementsSchema } from './dto/confirm-requirements.dto';
import { JobDescriptionParserService } from '../scoring/gap-analysis/job-description-parser.service';
import { diffParsedRequirements } from '../scoring/gap-analysis/jd-diff.util';
import { BaseController } from '../../shared/base.controller';
import { JwtAuthGuard } from '../auth-employer/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../shared/pipes/zod.pipe';
import { Seniority } from '@prisma/client';

class JobResponseTypeDto {
  id: string;
  title: string;
  description: string;
  status: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

class JobErrorResponseDto {
  statusCode: number;
  message: string;
  error: string;
}

@ApiTags('Jobs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('jobs')
export class JobsController extends BaseController {
  private readonly logger = new Logger(JobsController.name);

  constructor(
    private readonly jobsService: JobsService,
    private readonly parserService: JobDescriptionParserService
  ) {
    super();
  }

  // ─────────────────────────────
  // CREATE JOB
  // ─────────────────────────────
  @Post()
  @ApiOperation({
    summary: 'Create a new job post',
    description:
      'Creates a job in DRAFT status for the authenticated company. The job is not visible publicly until published.',
  })
  @ApiCreatedResponse({
    description: 'Job created successfully',
    type: JobResponseTypeDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid job payload',
    type: JobErrorResponseDto,
  })
  async create(@Req() req: any, @Body() dto: CreateJobDto) {
    const job = await this.jobsService.create(req.user.id, dto);
    return this.handleCreated(job, 'Job created successfully');
  }

  // ─────────────────────────────
  // GET MY JOBS
  // ─────────────────────────────
  @Get('my')
  @ApiOperation({
    summary: 'Get my jobs',
    description:
      'Returns all job posts created by the authenticated company, ordered by newest first.',
  })
  @ApiOkResponse({
    description: 'List of company job posts',
    type: [JobResponseTypeDto],
  })
  async getMyJobs(@Req() req: any) {
    const jobs = await this.jobsService.findMyJobs(req.user.id);
    return this.handleSuccess(jobs);
  }

  // ─────────────────────────────
  // PUBLISH JOB
  // ─────────────────────────────
  @Post(':id/publish')
  @ApiOperation({
    summary: 'Publish a job',
    description:
      'Publishes a draft job and makes it ACTIVE (visible to candidates). Simulates payment flow in current system.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'Job ID to publish',
    example: 'cma9x1k2p0000qwert123',
  })
  @ApiOkResponse({
    description: 'Job published successfully',
    type: JobResponseTypeDto,
  })
  @ApiNotFoundResponse({
    description: 'Job not found or does not belong to user',
    type: JobErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Access denied',
    type: JobErrorResponseDto,
  })
  async publish(@Req() req: any, @Param('id') id: string) {
    const job = await this.jobsService.publish(id, req.user.id);
    return this.handleSuccess(job, 'Job published successfully');
  }

  // ─────────────────────────────
  // CLOSE JOB
  // ─────────────────────────────
  @Post(':id/close')
  @ApiOperation({
    summary: 'Close a job',
    description:
      'Marks a job as CLOSED. Closed jobs are no longer visible to candidates or accept applications.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'Job ID to close',
    example: 'cma9x1k2p0000qwert123',
  })
  @ApiOkResponse({
    description: 'Job closed successfully',
    type: JobResponseTypeDto,
  })
  @ApiNotFoundResponse({
    description: 'Job not found or access denied',
    type: JobErrorResponseDto,
  })
  async close(@Req() req: any, @Param('id') id: string) {
    const job = await this.jobsService.close(id, req.user.id);
    return this.handleSuccess(job, 'Job closed successfully');
  }

  // ─────────────────────────────
  // PARSE JOB DESCRIPTION
  // ─────────────────────────────
  @Post(':id/parse-jd')
  @ApiOperation({
    summary: 'Extract structured requirements from JD text',
    description: 'Uses AI to parse a job description text and returns a proposed set of requirements and weights for review.',
  })
  async parseJd(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: ParseJobDescriptionDto,
  ) {
    // 1. Verify job exists and belongs to the authenticated org
    await this.jobsService.verifyOwnership(id, req.user.id);

    // 2. Call parser service
    const parsed = await this.parserService.parse(body.jdText);

    // 3. Build diff summary
    const diff = diffParsedRequirements(parsed);

    // 4. Return preview
    return this.handleSuccess({
      parsed,
      requiresReview: parsed.parserConfidence < 0.75,
      diff,
    });
  }

  // ─────────────────────────────
  // CONFIRM REQUIREMENTS
  // ─────────────────────────────
  @Post(':id/confirm-requirements')
  @ApiOperation({
    summary: 'Confirm AI-parsed requirements',
    description: 'Saves the structure requirements to the job post and logs an audit record.',
  })
  @UsePipes(new ZodValidationPipe(ParsedJobRequirementsSchema))
  async confirmRequirements(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: ParsedJobRequirementsDto,
  ) {
    // 1. Ownership verify and Idempotency check
    const job = await this.jobsService.verifyOwnership(id, req.user.id);

    if (
      job.parsedRequirements &&
      JSON.stringify(job.parsedRequirements) === JSON.stringify(body)
    ) {
      return this.handleSuccess(job, 'Job requirements confirmed and updated');
    }

    // 2. Update Job
    const updatedJob = await this.jobsService.updateRequirements(id, body);

    // 3. Audit Log (Mocked as requested)
    this.logger.log(`AUDIT_LOG: { entityType: 'Job', entityId: '${id}', action: 'REQUIREMENTS_CONFIRMED', actorId: '${req.user.id}', after: ${JSON.stringify(body)} }`);

    return this.handleSuccess(updatedJob, 'Job requirements confirmed and updated');
  }
}
