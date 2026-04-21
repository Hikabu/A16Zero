import { Controller, Get, Post, Patch, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BaseController } from '../common/base.controller';

@ApiTags('Candidates')
@ApiBearerAuth()
@Controller('candidates')
export class CandidatesController extends BaseController {
  
  @Get()
  @ApiOperation({ summary: 'Get all candidates (Mock)' })
  async getAll() {
    return this.handleSuccess([
      { id: '1', firstName: 'John', lastName: 'Doe', email: 'john@example.com', skills: ['NestJS', 'TypeScript'] },
      { id: '2', firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', skills: ['React', 'Solidity'] },
    ]);
  }

  @Post('shortlist/:jobId/:candidateId')
  @ApiOperation({ summary: 'Shortlist a candidate for a job (Mock)' })
  async shortlist(@Param('jobId') jobId: string, @Param('candidateId') candidateId: string) {
    return this.handleSuccess({ 
      id: 's1', 
      jobPostId: jobId, 
      candidateId: candidateId, 
      status: 'PENDING',
      matchTier: 'TOP_MATCH'
    }, 'Candidate shortlisted successfully');
  }

  @Patch('shortlist/:id/status')
  @ApiOperation({ summary: 'Update shortlist status (Mock)' })
  async updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.handleSuccess({ 
      id, 
      status: body.status 
    }, 'Status updated successfully');
  }
}
