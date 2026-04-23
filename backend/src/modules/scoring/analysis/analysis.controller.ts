import {
	Controller,
	Post,
	Get,
	Body,
	Param,
	UseGuards,
	NotFoundException,
	HttpCode,
	HttpStatus,
  } from '@nestjs/common';
  
  import { Queue } from 'bullmq';
  import { InjectQueue } from '@nestjs/bullmq';
  import { CacheService } from '../cache/cache.service';
  import { InternalKeyGuard } from '../../scorecard/internal-key.guard';
  import {
	ApiTags,
	ApiOperation,
	ApiHeader,
	ApiOkResponse,
	ApiCreatedResponse,
	ApiNotFoundResponse,
	ApiBearerAuth,
  } from '@nestjs/swagger';
  
  import { PrismaService } from '../../../prisma/prisma.service';
  import {
	CreateScorecardJobDto,
	RecomputeScorecardJobDto,
  } from './analysis.dto';

  import { Prisma } from '@prisma/client';

  
  @ApiTags('Developer Scorecard')
  @Controller('scorecard/jobs')
  export class AnalysisController {
	constructor(
	  @InjectQueue('signal-compute') private readonly signalQueue: Queue,
	  private readonly cacheService: CacheService,
	  private readonly prisma: PrismaService,
	) {}
  
	// ─────────────────────────────────────────────
	// CREATE JOB
	// ─────────────────────────────────────────────
  
	@Post()
	@HttpCode(HttpStatus.CREATED)
	@ApiOperation({
	  summary: 'Create developer scorecard job',
	  description:
		'Creates or reuses cached scoring job for a GitHub username and returns a jobId for tracking progress.',
	})
	@ApiCreatedResponse({
	  description: 'Job successfully created',
	  schema: {
		example: {
		  jobId: 'job_123abc',
		},
	  },
	})
	async createAnalysis(@Body() body: CreateScorecardJobDto) {
	  const { githubUsername } = body;
  
	  const cacheKey = this.cacheService.buildCacheKey(githubUsername);
  
	  const cachedResult = await this.cacheService.get(cacheKey);
  
	  if (cachedResult) {
		const job = await this.signalQueue.add(
		  'sync-profile',
		  { githubUsername, cached: true },
		  {
			jobId: `cached-${cacheKey}`,
		  },
		);
  
		await job.updateProgress(100);
		return { jobId: job.id };
	  }
  
	  let profile = await this.prisma.githubProfile.findUnique({
		where: { githubUsername },
	  });
  
	  if (!profile) {
		const ts = Date.now();
  
		const user = await this.prisma.user.create({
		  data: {
			username: `auto-${githubUsername}-${ts}`,
			email: `auto-${githubUsername}-${ts}@system.local`,
		  },
		});
  
		const candidate = await this.prisma.candidate.create({
		  data: { userId: user.id },
		});
  
		const dev = await this.prisma.developerCandidate.create({
		  data: { candidateId: candidate.id },
		});
  
		profile = await this.prisma.githubProfile.create({
		  data: {
			devCandidateId: dev.id,
			githubUsername,
			githubUserId: `id-${ts}`,
			encryptedToken: '',
		  },
		});
	  }
  
	  const job = await this.signalQueue.add('sync-profile', {
		candidateId: profile.devCandidateId,
		githubProfileId: profile.id,
		githubUsername,
	  });
  
	  return { jobId: job.id };
	}
  
	// ─────────────────────────────────────────────
	// FORCE RECOMPUTE (ADMIN)
	// ─────────────────────────────────────────────
  
	@UseGuards(InternalKeyGuard)
	@ApiHeader({
	  name: 'X-Internal-Key',
	  required: true,
	  description: 'Internal service authentication key',
	})
	@Post('recompute')
	@HttpCode(HttpStatus.CREATED)
	@ApiOperation({
	  summary: 'Force recompute scorecard job',
	  description:
		'Invalidates cache (optional) and enqueues a fresh scoring job.',
	})
	async recompute(@Body() body: RecomputeScorecardJobDto) {
	  const { githubUsername, force } = body;
  
	  const cacheKey = this.cacheService.buildCacheKey(githubUsername);
  
	  if (force) {
		await this.cacheService.invalidate(cacheKey);
  
		await this.prisma.githubProfile.update({
		  where: { githubUsername },
		  data: { rawDataSnapshot:  Prisma.DbNull },
		});
	  }
  
	  const profile = await this.prisma.githubProfile.findUnique({
		where: { githubUsername },
	  });
  
	  if (!profile) {
		throw new NotFoundException('Profile not found');
	  }
  
	  const job = await this.signalQueue.add('sync-profile', {
		candidateId: profile.devCandidateId,
		githubProfileId: profile.id,
		githubUsername,
	  });
  
	  return { jobId: job.id };
	}
  
	// ─────────────────────────────────────────────
	// STATUS
	// ─────────────────────────────────────────────
  
	@Get(':jobId/status')
	@ApiOperation({
	  summary: 'Get scorecard job status',
	  description: 'Returns current processing state and progress.',
	})
	async getStatus(@Param('jobId') jobId: string) {
	  const job = await this.signalQueue.getJob(jobId);
  
	  if (!job) throw new NotFoundException('Job not found');
  
	  const state = await job.getState();
	  const progress = job.progress;
  
	  return {
		status: state,
		progress,
	  };
	}
  
	// ─────────────────────────────────────────────
	// RESULT
	// ─────────────────────────────────────────────
  
	@Get(':jobId/result')
	@ApiOperation({
	  summary: 'Get scorecard result',
	  description: 'Returns final computed developer scorecard.',
	})
	async getResult(@Param('jobId') jobId: string) {
	  const job = await this.signalQueue.getJob(jobId);
  
	  if (!job) throw new NotFoundException('Job not found');
  
	  const state = await job.getState();
  
	  if (state === 'completed') {
		return {
		  status: 'completed',
		  result: job.returnvalue,
		};
	  }
  
	  return {
		status: state,
		result: null,
	  };
	}
  }