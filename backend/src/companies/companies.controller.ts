import { Controller, Get, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import { BaseController } from '../common/base.controller';

@ApiTags('Companies')
@ApiBearerAuth()
@Controller('companies')
export class CompaniesController extends BaseController {
  constructor(private readonly companiesService: CompaniesService) {
    super();
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current company profile' })
  async getMe(@Request() req) {
    const company = await this.companiesService.findOne(req.user.id);
    return this.handleSuccess(company);
  }
}
