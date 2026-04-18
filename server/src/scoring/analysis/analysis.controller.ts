import { Controller, Post, Get, Body, Param, UseGuards, NotFoundException } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { CacheService } from '../cache/cache.service';
import { InternalKeyGuard } from '../../scorecard/internal-key.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Analysis')
@Controller('api/analysis')
export class AnalysisController {
  constructor(
    @InjectQueue('signal-compute') private readonly signalQueue: Queue,
    private readonly cacheService: CacheService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('recompute')
  @UseGuards(InternalKeyGuard)
  @ApiOperation({ 
    summary: 'Trigger a re-analysis for a developer profile',
    description: 'Invalidates cache if force=true and enqueues a new scoring job.'
  })
  async recompute(
    @Body() body: { githubUsername: string; force?: boolean },
  ) {
    const { githubUsername, force } = body;
    const cacheKey = this.cacheService.buildCacheKey(githubUsername);

    if (force) {
      await this.cacheService.invalidate(cacheKey);
    }

    // Find profile
    const profile = await this.prisma.githubProfile.findUnique({
      where: { githubUsername },
    });

    if (!profile) {
      throw new NotFoundException(`Profile for ${githubUsername} not found`);
    }

    const job = await this.signalQueue.add('sync-profile', {
      candidateId: profile.devCandidateId,
      githubProfileId: profile.id,
    });

    return { jobId: job.id };
  }

  @Get(':jobId/result')
  @ApiOperation({ 
    summary: 'Get the result of an analysis job',
    description: 'Polls BullMQ for job status and returns the final AnalysisResult when complete.'
  })
  async getResult(@Param('jobId') jobId: string) {
    const job = await this.signalQueue.getJob(jobId);

    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }

    const [state, progress] = await Promise.all([
      job.getState(),
      Promise.resolve(job.progress)
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

    // Active, Waiting, Delayed, etc.
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
