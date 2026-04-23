import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth_employer/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('company')
@ApiBearerAuth()
@Controller('company')
export class CompanyController {
  constructor(private prisma: PrismaService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current company profile' })
  async getMe(@Request() req) {
    const company = await this.prisma.company.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        legalName: true,
        country: true,
        walletAddress: true,
        createdAt: true,
      },
    });
    return company;
  }
}
