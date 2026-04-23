import { Controller, Get, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { BaseController } from '../../shared/base.controller';
import { DashboardStatsResponseDto } from './dto/dashboard-stats.response.dto';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController extends BaseController {
  constructor(private readonly analyticsService: AnalyticsService) {
    super();
  }

  @Get('dashboard')
  @ApiOperation({
    summary: 'Get dashboard statistics',
    description: `
Returns aggregated analytics data for the authenticated company.

This endpoint is typically used to power dashboard views in frontend applications.

Includes:
- Total number of jobs posted
- Number of active jobs
- Total number of shortlisted candidates across all jobs

Requires a valid Bearer token.

Authorization header format:
Authorization: Bearer <token>
    `,
  })
  @ApiOkResponse({
    description: 'Dashboard statistics retrieved successfully',
    type: DashboardStatsResponseDto,
    schema: {
      example: {
        success: true,
        data: {
          totalJobs: 25,
          activeJobs: 10,
          totalCandidatesShortlisted: 42,
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Missing or invalid token',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    schema: {
      example: {
        statusCode: 500,
        message: 'Internal server error',
        error: 'Internal Server Error',
      },
    },
  })
  async getDashboard(@Request() req): Promise<DashboardStatsResponseDto> {
    const stats = await this.analyticsService.getDashboardStats(req.user.id);
    return this.handleSuccess(stats);
  }
}