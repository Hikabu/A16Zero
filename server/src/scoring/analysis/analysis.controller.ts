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
	ApiParam,
	ApiBody,
	ApiCreatedResponse,
	ApiOkResponse,
	ApiBadRequestResponse,
	ApiUnauthorizedResponse,
	ApiNotFoundResponse,
	ApiBearerAuth,
  } from '@nestjs/swagger';
  import { PrismaService } from '../../prisma/prisma.service';
  import { Prisma } from '@prisma/client';
  
  import {
	CreateAnalysisDto,
	RecomputeAnalysisDto,
  } from './dto/analysis.dto';
  
  import {
	JobResponseDto,
	JobStatusResponseDto,
	JobResultResponseDto,
	ErrorResponseDto,
  } from './dto/analysis-response.dto';
  
  @ApiTags('Analysis')
  @Controller('api/analysis')
  export class AnalysisController {
	constructor(
	  @InjectQueue('signal-compute') private readonly signalQueue: Queue,
	  private readonly cacheService: CacheService,
	  private readonly prisma: PrismaService,
	) {}
  
	@Post()
	@HttpCode(HttpStatus.CREATED)
	@ApiOperation({
	  summary: 'Trigger developer analysis',
	  description: `
  Creates or retrieves an analysis job for a developer.
  
  Flow:
  1. Checks cache using githubUsername + walletAddress
  2. If cached → returns completed job immediately
  3. If not → creates or finds developer profile
  4. Enqueues async analysis job
  
  Use this endpoint to start analysis from frontend.
	  `,
	})
	@ApiBody({
	  type: CreateAnalysisDto,
	  examples: {
		githubOnly: {
		  summary: 'Analyze by GitHub username',
		  value: { githubUsername: 'octocat' },
		},
		walletOnly: {
		  summary: 'Analyze by wallet',
		  value: {
			walletAddress: '9xQeWvG816bUx9EPf9z...',
		  },
		},
		both: {
		  summary: 'Analyze using both identifiers',
		  value: {
			githubUsername: 'octocat',
			walletAddress: '9xQeWvG816bUx9EPf9z...',
		  },
		},
	  },
	})
	@ApiCreatedResponse({
	  description: 'Analysis job created successfully',
	  type: JobResponseDto,
	  examples: {
		success: {
		  summary: 'Job created',
		  value: {
			jobId: '12345',
		  },
		},
	  },
	})
	@ApiBadRequestResponse({
	  description: 'Invalid input (missing identifiers or invalid wallet)',
	  type: ErrorResponseDto,
	})
	async createAnalysis(@Body() body: CreateAnalysisDto) {
	  // unchanged logic
	  const { githubUsername, walletAddress } = body;
	  const cacheKey = this.cacheService.buildCacheKey(
		githubUsername,
		walletAddress,
	  );
  
	  const cachedResult = await this.cacheService.get(cacheKey);
	  if (cachedResult) {
		const job = await this.signalQueue.add(
		  'sync-profile',
		  {
			githubUsername,
			walletAddress,
			cached: true,
		  },
		  {
			jobId: `cached-${cacheKey.replace(/:/g, '-')}`,
			removeOnComplete: false,
			attempts: process.env.NODE_ENV === 'test' ? 1 : 3,
		  },
		);
  
		await job.updateProgress(100);
		return { jobId: job.id };
	  }
  
	  let devCandidateId: string | undefined;
	  let githubProfileId: string | undefined;
  
	  if (githubUsername) {
		const ghProfile = await this.prisma.githubProfile.findUnique({
		  where: { githubUsername },
		});
		if (ghProfile) {
		  devCandidateId = ghProfile.devCandidateId;
		  githubProfileId = ghProfile.id;
		}
	  }
  
	  if (!devCandidateId && walletAddress) {
		const web3Profile = await this.prisma.web3Profile.findFirst({
		  where: { walletAddress },
		});
		if (web3Profile) {
		  devCandidateId = web3Profile.devCandidateId;
		}
	  }
  
	  if (!devCandidateId) {
		const ts = Date.now();
		const identifier = githubUsername || walletAddress?.slice(0, 8) || ts;
  
		const user = await this.prisma.user.create({
		  data: {
			username: `auto-${identifier}-${ts}`,
			email: `auto-${identifier}-${ts}@colosseum.internal`,
		  },
		});
  
		const candidate = await this.prisma.candidate.create({
		  data: { userId: user.id },
		});
  
		const devCandidate = await this.prisma.developerCandidate.create({
		  data: { candidateId: candidate.id },
		});
  
		devCandidateId = devCandidate.id;
  
		if (githubUsername) {
		  const profile = await this.prisma.githubProfile.create({
			data: {
			  devCandidateId,
			  githubUsername,
			  githubUserId: `id-${ts}`,
			  encryptedToken: 'v1:auto:auto:auto',
			},
		  });
		  githubProfileId = profile.id;
		}
  
		if (walletAddress) {
		  await this.prisma.web3Profile.create({
			data: {
			  devCandidateId,
			  walletAddress,
			},
		  });
		}
	  } else if (walletAddress) {
		await this.prisma.web3Profile.upsert({
		  where: { devCandidateId },
		  create: { devCandidateId, walletAddress },
		  update: { walletAddress },
		});
	  }
  
	  const job = await this.signalQueue.add(
		'sync-profile',
		{
		  candidateId: devCandidateId,
		  githubProfileId,
		  githubUsername,
		  walletAddress,
		},
		{
		  attempts: process.env.NODE_ENV === 'test' ? 1 : 3,
		},
	  );
  
	  return { jobId: job.id };
	}
  
	@Post('recompute')
	@HttpCode(HttpStatus.CREATED)
	@UseGuards(InternalKeyGuard)
	@ApiBearerAuth()
	@ApiOperation({
	  summary: 'Recompute analysis',
	  description: `
  Triggers a fresh analysis.
  
  - If force=true → cache is invalidated
  - Requires internal API key (Bearer token)
  
  Use this for admin/system reprocessing.
	  `,
	})
	@ApiBody({
	  type: RecomputeAnalysisDto,
	})
	@ApiCreatedResponse({
	  description: 'Recompute job created',
	  type: JobResponseDto,
	})
	@ApiUnauthorizedResponse({
	  description: 'Missing or invalid internal API key',
	  type: ErrorResponseDto,
	})
	@ApiNotFoundResponse({
	  description: 'Profile not found',
	  type: ErrorResponseDto,
	})
	async recompute(@Body() body: RecomputeAnalysisDto) {
	  const { githubUsername, walletAddress, force } = body;
  
	  const cacheKey = this.cacheService.buildCacheKey(
		githubUsername,
		walletAddress,
	  );
  
	  if (force && githubUsername) {
		await this.cacheService.invalidate(cacheKey);
		await this.prisma.githubProfile.update({
		  where: { githubUsername },
		  data: { rawDataSnapshot: Prisma.DbNull },
		});
	  } else if (force) {
		await this.cacheService.invalidate(cacheKey);
	  }
  
	  let devCandidateId: string | undefined;
	  let githubProfileId: string | undefined;
  
	  if (githubUsername) {
		const ghProfile = await this.prisma.githubProfile.findUnique({
		  where: { githubUsername },
		});
		if (ghProfile) {
		  devCandidateId = ghProfile.devCandidateId;
		  githubProfileId = ghProfile.id;
		}
	  }
  
	  if (!devCandidateId && walletAddress) {
		const web3Profile = await this.prisma.web3Profile.findFirst({
		  where: { walletAddress },
		});
		if (web3Profile) {
		  devCandidateId = web3Profile.devCandidateId;
		}
	  }
  
	  if (!devCandidateId) {
		throw new NotFoundException(`Profile not found for provided identifiers`);
	  }
  
	  const job = await this.signalQueue.add('sync-profile', {
		candidateId: devCandidateId,
		githubProfileId,
		githubUsername,
		walletAddress,
	  });
  
	  return { jobId: job.id };
	}
  
	@Get(':jobId/status')
	@ApiOperation({
	  summary: 'Get job status',
	  description: 'Returns current job state, stage, and progress percentage.',
	})
	@ApiParam({
	  name: 'jobId',
	  type: String,
	  example: '12345',
	  description: 'BullMQ job ID returned when creating analysis',
	})
	@ApiOkResponse({
	  description: 'Job status retrieved',
	  type: JobStatusResponseDto,
	})
	@ApiNotFoundResponse({
	  description: 'Job not found',
	  type: ErrorResponseDto,
	})
	async getStatus(@Param('jobId') jobId: string) {
	  const job = await this.signalQueue.getJob(jobId);
  
	  if (!job) {
		throw new NotFoundException(`Job ${jobId} not found`);
	  }
  
	  const [state, progress] = await Promise.all([
		job.getState(),
		Promise.resolve(job.progress),
	  ]);
  
	  const stageMap: Record<string, string> = {
		completed: 'complete',
		failed: 'failed',
		active: 'analyzing_projects',
		waiting: 'queued',
		delayed: 'queued',
	  };
  
	  return {
		status:
		  state === 'completed'
			? 'complete'
			: state === 'failed'
			? 'failed'
			: 'pending',
		stage: stageMap[state] || 'unknown',
		progress: this.parseProgress(progress),
		failureReason: job.failedReason || undefined,
	  };
	}
  
	@Get(':jobId/result')
	@ApiOperation({
	  summary: 'Get job result',
	  description: 'Returns final analysis result if completed.',
	})
	@ApiParam({
	  name: 'jobId',
	  type: String,
	  example: '12345',
	})
	@ApiOkResponse({
	  description: 'Job result response',
	  type: JobResultResponseDto,
	})
	@ApiNotFoundResponse({
	  description: 'Job not found',
	  type: ErrorResponseDto,
	})
	async getResult(@Param('jobId') jobId: string) {
	  const job = await this.signalQueue.getJob(jobId);
  
	  if (!job) {
		throw new NotFoundException(`Job ${jobId} not found`);
	  }
  
	  const [state, progress] = await Promise.all([
		job.getState(),
		Promise.resolve(job.progress),
	  ]);
  
	  if (state === 'completed') {
		return {
		  status: 'completed',
		  progress: 100,
		  result: job.returnvalue,
		};
	  }
  
	  if (state === 'failed') {
		return {
		  status: 'failed',
		  progress: this.parseProgress(progress),
		  error: job.failedReason,
		};
	  }
  
	  return {
		status: 'pending',
		progress: this.parseProgress(progress),
	  };
	}
  
	private parseProgress(progress: any): number {
	  if (typeof progress === 'number') return progress;
	  if (typeof progress === 'string') {
		try {
		  const parsed = JSON.parse(progress);
		  return typeof parsed.percent === 'number' ? parsed.percent : 0;
		} catch {
		  return 0;
		}
	  }
	  return 0;
	}
  }