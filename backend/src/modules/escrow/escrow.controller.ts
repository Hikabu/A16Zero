import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../shared/base.controller';
import { JwtAuthGuard } from '../auth-employer/guards/jwt-auth.guard';
import { EscrowService } from './escrow.service';
import {
  ConfirmFundedDto,
  ConfirmResolvedDto,
  SetCandidateDto,
} from './dto/escrow.dto';

@ApiTags('Escrow')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('escrow')
export class EscrowController extends BaseController {
  constructor(private readonly escrowService: EscrowService) {
    super();
  }

  @Post('confirm-funded')
  async confirmFunded(@Req() req: any, @Body() dto: ConfirmFundedDto) {
    const result = await this.escrowService.confirmFunded(req.user.id, dto);
    return this.handleSuccess(result, 'Escrow funded on-chain');
  }

  @Post('set-candidate')
  async setCandidate(@Req() req: any, @Body() dto: SetCandidateDto) {
    const result = await this.escrowService.setCandidate(req.user.id, dto);
    return this.handleSuccess(result, 'Candidate wallet saved');
  }

  @Post('confirm-released')
  async confirmReleased(@Req() req: any, @Body() dto: ConfirmResolvedDto) {
    const result = await this.escrowService.confirmReleased(req.user.id, dto);
    return this.handleSuccess(result, 'Escrow released on-chain');
  }

  @Post('confirm-refunded')
  async confirmRefunded(@Req() req: any, @Body() dto: ConfirmResolvedDto) {
    const result = await this.escrowService.confirmRefunded(req.user.id, dto);
    return this.handleSuccess(result, 'Escrow refunded on-chain');
  }

  @Get('status/:jobPostId')
  async status(@Req() req: any, @Param('jobPostId') jobPostId: string) {
    const result = await this.escrowService.status(req.user.id, jobPostId);
    return this.handleSuccess(result);
  }
}
