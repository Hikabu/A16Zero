import { Controller, Post, Get, Patch, Body, Param, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { BaseController } from '../common/base.controller';

@ApiTags('Jobs')
@ApiBearerAuth()
@Controller('jobs')
export class JobsController extends BaseController {
  constructor(private readonly jobsService: JobsService) {
    super();
  }

  @Post()
  @ApiOperation({ summary: 'Create a new job post' })
  async create(@Request() req, @Body() dto: CreateJobDto) {
    const job = await this.jobsService.create(req.user.id, dto);
    return this.handleCreated(job, 'Job created successfully');
  }

  @Get('my')
  @ApiOperation({ summary: 'Get jobs created by the current company' })
  async getMyJobs(@Request() req) {
    const jobs = await this.jobsService.findMyJobs(req.user.id);
    return this.handleSuccess(jobs);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish a job (simulate payment)' })
  async publish(@Request() req, @Param('id') id: string) {
    const job = await this.jobsService.publish(id, req.user.id);
    return this.handleSuccess(job, 'Job published successfully');
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Close a job' })
  async close(@Request() req, @Param('id') id: string) {
    const job = await this.jobsService.close(id, req.user.id);
    return this.handleSuccess(job, 'Job closed successfully');
  }
}
