import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { BaseController } from '../../shared/base.controller';
import { JwtAuthGuard } from '../auth-employer/guards/jwt-auth.guard';
import { EscrowService } from './escrow.service';
import {
  ConfirmFundedDto,
  ConfirmResolvedDto,
  SetCandidateDto,
} from './dto/escrow.dto';

const JOB_POST_ID = '8d4fa8cc-7df5-4f0f-91a2-bc1a9b2b7c11';
const ESCROW_ADDRESS = '7eJ8hYqH6q6Gdfrb2uP83L6eJrwGQXSjQ2E6H6n8ZCwK';
const CANDIDATE_WALLET = 'GkYqf7H9jFQpMe6TNz6N6BZkdn4xB8oVeDxXM7dRrM2p';

const escrowJobExample = {
  id: JOB_POST_ID,
  escrowId: '42',
  escrowAddress: ESCROW_ADDRESS,
  candidateWallet: CANDIDATE_WALLET,
  escrowStatus: 'FUNDED',
};

const statusExample = {
  dbState: {
    jobPostId: JOB_POST_ID,
    escrowId: '42',
    escrowAddress: ESCROW_ADDRESS,
    candidateWallet: CANDIDATE_WALLET,
    escrowStatus: 'CANDIDATE_SET',
  },
  onChainState: {
    employer: '8M7wZrVdD8hJorvekgZ4Uxq4A86hzHGzVJM4idJpJx2k',
    candidate: CANDIDATE_WALLET,
    amount: '250000000',
    released: false,
  },
};

const errorSchema = (statusCode: number, message: string, error: string) => ({
  example: { statusCode, message, error },
});

@ApiTags('Escrow')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('escrow')
export class EscrowController extends BaseController {
  constructor(private readonly escrowService: EscrowService) {
    super();
  }

  @Post('confirm-funded')
  @ApiOperation({
    summary: 'Confirm funded escrow',
    description:
      'Employer-only endpoint called after the employer funds escrow on-chain. The backend verifies the PDA, employer wallet, and funded amount, then records the CREATED -> FUNDED transition. Idempotency: repeating the same confirmation is safe and must not create duplicate state; conflicting funding attempts are rejected.',
  })
  @ApiBody({ type: ConfirmFundedDto })
  @ApiCreatedResponse({
    description: 'Escrow funding verified and stored.',
    schema: {
      example: {
        success: true,
        message: 'Escrow funded on-chain',
        data: escrowJobExample,
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      'Invalid DTO, transaction not found on-chain, wrong amount funded, invalid PDA, or invalid employer wallet.',
    schema: errorSchema(400, 'Wrong amount funded', 'Bad Request'),
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid JWT.',
    schema: errorSchema(401, 'Unauthorized', 'Unauthorized'),
  })
  @ApiForbiddenResponse({
    description:
      'Authenticated user is not the employer that owns the job post.',
    schema: errorSchema(403, 'Forbidden resource', 'Forbidden'),
  })
  @ApiConflictResponse({
    description: 'Escrow is already funded with conflicting details.',
    schema: errorSchema(409, 'Escrow already funded', 'Conflict'),
  })
  async confirmFunded(@Req() req: any, @Body() dto: ConfirmFundedDto) {
    const result = await this.escrowService.confirmFunded(req.user.id, dto);
    return this.handleSuccess(result, 'Escrow funded on-chain');
  }

  @Post('set-candidate')
  @ApiOperation({
    summary: 'Attach candidate wallet',
    description:
      'Employer-only endpoint called after the candidate has been set on-chain. The backend verifies the funded escrow and candidate wallet, then records the FUNDED -> CANDIDATE_SET transition. Idempotency: setting the same candidate twice should return the current state; changing an existing candidate is rejected.',
  })
  @ApiBody({ type: SetCandidateDto })
  @ApiCreatedResponse({
    description: 'Candidate wallet verified and stored.',
    schema: {
      example: {
        success: true,
        message: 'Candidate wallet saved',
        data: { ...escrowJobExample, escrowStatus: 'CANDIDATE_SET' },
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      'Invalid DTO, escrow not funded yet, invalid wallet format, or on-chain candidate mismatch.',
    schema: errorSchema(
      400,
      'Escrow must be FUNDED before setting candidate',
      'Bad Request',
    ),
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid JWT.',
    schema: errorSchema(401, 'Unauthorized', 'Unauthorized'),
  })
  @ApiForbiddenResponse({
    description:
      'Authenticated user is not the employer that owns the job post.',
    schema: errorSchema(403, 'Forbidden resource', 'Forbidden'),
  })
  @ApiConflictResponse({
    description:
      'Candidate already set with different wallet or escrow already resolved.',
    schema: errorSchema(409, 'Candidate already set', 'Conflict'),
  })
  async setCandidate(@Req() req: any, @Body() dto: SetCandidateDto) {
    const result = await this.escrowService.setCandidate(req.user.id, dto);
    return this.handleSuccess(result, 'Candidate wallet saved');
  }

  @Post('confirm-released')
  @ApiOperation({
    summary: 'Confirm released escrow',
    description:
      'Employer-only endpoint called after the on-chain program releases escrow to the candidate. The backend verifies the on-chain resolution and signer ownership, then records CANDIDATE_SET -> RELEASED. Idempotency: repeated release confirmation returns the released state; refunding after release is rejected.',
  })
  @ApiBody({ type: ConfirmResolvedDto })
  @ApiCreatedResponse({
    description: 'Escrow release verified and stored.',
    schema: {
      example: {
        success: true,
        message: 'Escrow released on-chain',
        data: { ...escrowJobExample, escrowStatus: 'RELEASED' },
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      'Invalid DTO, escrow not funded, candidate not set, not resolved on-chain, or wrong signer releasing.',
    schema: errorSchema(
      400,
      'Candidate must be set before release',
      'Bad Request',
    ),
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid JWT.',
    schema: errorSchema(401, 'Unauthorized', 'Unauthorized'),
  })
  @ApiForbiddenResponse({
    description:
      'Authenticated user is not the employer that owns the job post.',
    schema: errorSchema(403, 'Forbidden resource', 'Forbidden'),
  })
  @ApiConflictResponse({
    description: 'Escrow already released or refunded.',
    schema: errorSchema(409, 'Escrow already resolved', 'Conflict'),
  })
  async confirmReleased(@Req() req: any, @Body() dto: ConfirmResolvedDto) {
    const result = await this.escrowService.confirmReleased(req.user.id, dto);
    return this.handleSuccess(result, 'Escrow released on-chain');
  }

  @Post('confirm-refunded')
  @ApiOperation({
    summary: 'Confirm refunded escrow',
    description:
      'Employer-only endpoint called after the on-chain program refunds escrow to the employer. The backend verifies on-chain resolution and ownership, then records FUNDED or CANDIDATE_SET -> REFUNDED. Idempotency: repeated refund confirmation returns the refunded state; release after refund is rejected.',
  })
  @ApiBody({ type: ConfirmResolvedDto })
  @ApiCreatedResponse({
    description: 'Escrow refund verified and stored.',
    schema: {
      example: {
        success: true,
        message: 'Escrow refunded on-chain',
        data: { ...escrowJobExample, escrowStatus: 'REFUNDED' },
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      'Invalid DTO, escrow not funded, not resolved on-chain, or wrong signer refunding.',
    schema: errorSchema(
      400,
      'Escrow must be funded before refund',
      'Bad Request',
    ),
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid JWT.',
    schema: errorSchema(401, 'Unauthorized', 'Unauthorized'),
  })
  @ApiForbiddenResponse({
    description:
      'Authenticated user is not the employer that owns the job post.',
    schema: errorSchema(403, 'Forbidden resource', 'Forbidden'),
  })
  @ApiConflictResponse({
    description: 'Escrow already released or refunded.',
    schema: errorSchema(409, 'Escrow already released', 'Conflict'),
  })
  async confirmRefunded(@Req() req: any, @Body() dto: ConfirmResolvedDto) {
    const result = await this.escrowService.confirmRefunded(req.user.id, dto);
    return this.handleSuccess(result, 'Escrow refunded on-chain');
  }

  @Get('status/:jobPostId')
  @ApiOperation({
    summary: 'Get escrow status',
    description:
      'Employer-only endpoint for polling persisted escrow state and the latest on-chain state. It does not transition state. Only the employer that owns the job post can read it.',
  })
  @ApiParam({
    name: 'jobPostId',
    description: 'Job post id owned by the authenticated employer.',
    example: JOB_POST_ID,
  })
  @ApiOkResponse({
    description: 'Escrow status returned.',
    schema: { example: { success: true, data: statusExample } },
  })
  @ApiBadRequestResponse({
    description: 'Invalid jobPostId parameter.',
    schema: errorSchema(400, 'Invalid jobPostId', 'Bad Request'),
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid JWT.',
    schema: errorSchema(401, 'Unauthorized', 'Unauthorized'),
  })
  @ApiForbiddenResponse({
    description: 'Authenticated user is not the owner of the job post.',
    schema: errorSchema(403, 'Forbidden resource', 'Forbidden'),
  })
  @ApiConflictResponse({
    description: 'Reserved for state read conflicts.',
    schema: errorSchema(409, 'Escrow state conflict', 'Conflict'),
  })
  async status(@Req() req: any, @Param('jobPostId') jobPostId: string) {
    const result = await this.escrowService.status(req.user.id, jobPostId);
    return this.handleSuccess(result);
  }
}
