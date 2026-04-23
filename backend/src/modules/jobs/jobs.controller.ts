import {
	Controller,
	Post,
	Get,
	Body,
	Param,
	Req,
  } from '@nestjs/common';
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
  import { BaseController } from '../../shared/base.controller';
  
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
  @Controller('jobs')
  export class JobsController extends BaseController {
	constructor(private readonly jobsService: JobsService) {
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
  }