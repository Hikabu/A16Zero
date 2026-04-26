import { Controller, Get, Post, Patch, Param, Body } from '@nestjs/common';
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

@ApiTags('Applicants')
@ApiBearerAuth()
@Controller('applicants')
export class ApplicantsController extends BaseController {
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
}
