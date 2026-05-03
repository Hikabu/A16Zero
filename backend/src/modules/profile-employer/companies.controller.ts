import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';

import { CompaniesService } from './companies.service';
import { BaseController } from '../../shared/base.controller';
import { CompanyProfileResponseDto } from './dto/company.response.dto';
import { JwtAuthGuard } from '../auth-employer/guards/jwt-auth.guard';

@ApiTags('Profile (company)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('me/company')
export class CompaniesController extends BaseController {
  constructor(private readonly companiesService: CompaniesService) {
    super();
  }

  @Get()
  @ApiOperation({
    summary: 'Get current company profile',
    description:
      'Returns the authenticated company profile including job post statistics.',
  })
  @ApiOkResponse({
    description: 'Company profile retrieved successfully',
    type: CompanyProfileResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Company not found for authenticated user',
  })
  async getMe(@Req() req: any) {
    const company = await this.companiesService.findOne(req.user.id);
    return this.handleSuccess(company);
  }
}
