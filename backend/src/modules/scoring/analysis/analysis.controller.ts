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
  Req,
  BadRequestException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { CacheService } from '../cache/cache.service';
import { InternalKeyGuard } from '../../scorecard/internal-key.guard';
import { OptionalJwtAuthGuard } from '../../auth-candidate/guards/optional-jwt-auth.guard';
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
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

import { CreateAnalysisDto, RecomputeAnalysisDto } from './dto/analysis.dto';

import {
  JobResponseDto,
  JobStatusResponseDto,
  JobResultResponseDto,
  AnalysisErrorResponseDto,
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
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Trigger developer analysis',
    description: `
Creates or retrieves an analysis job for a developer.

Modes:
1. Authenticated: Reads linked GitHub/Wallet from profile.
2. Anonymous: Takes identifiers from body.

Features:
- Cache check (skip if force=true)
- GitHub snapshot reuse (<24h)
- Async execution via BullMQ
    `,
  })
  @ApiBody({ type: CreateAnalysisDto })
  @ApiCreatedResponse({ type: JobResponseDto })
  @ApiBadRequestResponse({ type: AnalysisErrorResponseDto })
  async createAnalysis(
    @Req() req: any,
    @Body() body: CreateAnalysisDto & { force?: boolean },
  ) {
    let githubUsername: string | null = null;
    let walletAddress: string | null = null;
    let useGithubCache = false;

    if (req.user) {
      const userId = req.user.id;
      const githubProfile = await this.prisma.githubProfile.findUnique({
        where: { userId },
      });
      const web3Profile = await this.prisma.web3Profile.findUnique({
        where: { userId },
      });

      if (!githubProfile && !web3Profile) {
        throw new BadRequestException(
          'No linked accounts. Use POST /sync/github or POST /sync/wallet first.',
        );
      }

      githubUsername = githubProfile?.githubUsername ?? null;
      walletAddress = web3Profile?.solanaAddress ?? null;

      if (githubProfile?.lastSyncAt) {
        useGithubCache =
          githubProfile.lastSyncAt.getTime() > Date.now() - 86_400_000;
      }
    } else {
      githubUsername = body.githubUsername ?? null;
      walletAddress = body.walletAddress ?? null;

      if (!githubUsername && !walletAddress) {
        throw new BadRequestException(
          'githubUsername or walletAddress is required',
        );
      }

      if (
        walletAddress &&
        !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress)
      ) {
        throw new BadRequestException('Invalid Solana wallet address format');
      }
    }

    const mode =
      githubUsername && walletAddress
        ? 'github+wallet'
        : walletAddress
          ? 'wallet-only'
          : 'github-only';

    const cacheKey = this.cacheService.buildCacheKey(
      githubUsername ?? undefined,
      walletAddress ?? undefined,
    );

    if (!body.force) {
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        return { jobId: null, cached: true, result: cached };
      }
    }

    const jobRecord = await this.prisma.analysisJob.create({
      data: {
        status: 'pending',
        input: { githubUsername, walletAddress, mode, useGithubCache } as any,
        userId: req.user?.id ?? null,
      },
    });

    await this.signalQueue.add('analyze', {
      jobId: jobRecord.id,
      githubUsername,
      walletAddress,
      mode,
      useGithubCache,
    });

    return { jobId: jobRecord.id };
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
    type: AnalysisErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Profile not found',
    type: AnalysisErrorResponseDto,
  })
  async recompute(@Req() req: any, @Body() body: RecomputeAnalysisDto) {
    return this.createAnalysis(req, { ...body, force: true });
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
    type: AnalysisErrorResponseDto,
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
    type: AnalysisErrorResponseDto,
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
