import {
	Controller,
	Delete,
	Param,
	Body,
	HttpCode,
	HttpStatus,
	Post,
  } from '@nestjs/common';
  import {
	ApiTags,
	ApiOperation,
	ApiBody,
	ApiParam,
	ApiResponse,
	ApiCreatedResponse,
	ApiBadRequestResponse,
	ApiUnauthorizedResponse,
	ApiNotFoundResponse,
	ApiBearerAuth,
  } from '@nestjs/swagger';
  import { VouchesService } from './vouches.service';
  import { ConfirmVouchDto } from './dto/ConfirmVoucher.dto';
  import { RevokeVouchDto } from './dto/RevokeVouch.dto';
  import { VouchResponseDto } from './dto/VouchResponse.dto';
  import { ErrorResponseDto } from './dto/ErrorResponse.dto';
  
  @ApiTags('Vouches')
  @Controller('vouch')
  export class VouchesController {
	constructor(private readonly vouchesService: VouchesService) {}
  
	@Post('confirm')
	@ApiOperation({
	  summary: 'Confirm a vouch (on-chain verified endorsement)',
	  description: `
  Creates and anchors a vouch for a candidate using a Solana transaction.
  
  This endpoint:
  - Verifies the transaction exists on-chain
  - Confirms the voucher wallet is the fee payer
  - Validates memo message matches the provided message
  - Enforces rules: no self-vouch, no duplicates, budget limits
  
  Use this after a user submits a signed on-chain endorsement.
	  `,
	})
	@ApiBody({
	  type: ConfirmVouchDto,
	  description: 'Payload required to confirm a vouch',
	})
	@ApiCreatedResponse({
	  description: 'Vouch successfully confirmed and stored',
	  type: VouchResponseDto,
	  examples: {
		verifiedVoucher: {
		  summary: 'Successful vouch from a high-quality (verified) wallet',
		  value: {
			id: 'vouch_123',
			candidateId: 'candidate_456',
			voucherWallet: '9xQeWvG816bUx9EP...',
			message: 'Great engineer, highly recommend',
			txSignature: '5Nf7...abc',
			weight: 'verified',
			isActive: true,
			confirmedAt: '2026-04-23T10:00:00.000Z',
			expiresAt: '2026-10-20T10:00:00.000Z',
		  },
		},
		newWalletVoucher: {
		  summary: 'Vouch created from a new wallet (lower trust weight)',
		  value: {
			id: 'vouch_789',
			candidateId: 'candidate_456',
			voucherWallet: '7Gh3...xyz',
			message: 'Seems promising',
			txSignature: '8Abc...999',
			weight: 'new',
			isActive: true,
			confirmedAt: '2026-04-23T11:00:00.000Z',
			expiresAt: '2026-10-20T11:00:00.000Z',
		  },
		},
	  },
	})
	@ApiBadRequestResponse({
	  description: 'Validation error, duplicate vouch, self-vouch, budget exceeded, or invalid transaction',
	  type: ErrorResponseDto,
	  examples: {
		duplicate: {
		  summary: 'User already vouched for this candidate',
		  value: {
			statusCode: 400,
			message: 'Already vouched for this candidate',
			error: 'Bad Request',
		  },
		},
		selfVouch: {
		  summary: 'User attempted to vouch for themselves',
		  value: {
			statusCode: 400,
			message: 'Cannot vouch for yourself',
			error: 'Bad Request',
		  },
		},
		invalidTx: {
		  summary: 'Transaction failed verification',
		  value: {
			statusCode: 400,
			message: 'No Memo instruction found whose text matches the provided message',
			error: 'Bad Request',
		  },
		},
	  },
	})
	@ApiNotFoundResponse({
	  description: 'Candidate not found',
	  type: ErrorResponseDto,
	  examples: {
		notFound: {
		  summary: 'Candidate does not exist',
		  value: {
			statusCode: 404,
			message: 'Candidate not found for identifier: octocat',
			error: 'Not Found',
		  },
		},
	  },
	})
	async confirmVouch(@Body() body: ConfirmVouchDto) {
	  return this.vouchesService.confirmVouch(body);
	}
  
	@Delete(':id')
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiBearerAuth()
	@ApiOperation({
	  summary: 'Revoke a vouch',
	  description: `
  Revokes an existing vouch.
  
  Authentication is done via wallet signature (NOT JWT).
  
  Frontend must:
  1. Construct message: "revoke-vouch:<vouchId>"
  2. Sign it with the wallet
  3. Send base58-encoded signature
  
  This endpoint:
  - Verifies signature ownership
  - Ensures vouch belongs to wallet
  - Marks vouch as inactive
	  `,
	})
	@ApiParam({
	  name: 'id',
	  type: String,
	  required: true,
	  description: 'Unique identifier of the vouch',
	  example: 'vouch_123',
	})
	@ApiBody({
	  type: RevokeVouchDto,
	  description: 'Wallet signature proof required to revoke a vouch',
	})
	@ApiResponse({
	  status: 204,
	  description: 'Vouch successfully revoked (no response body)',
	})
	@ApiBadRequestResponse({
	  description: 'Malformed signature or already inactive vouch',
	  type: ErrorResponseDto,
	  examples: {
		invalidSignatureFormat: {
		  summary: 'Signature could not be decoded',
		  value: {
			statusCode: 400,
			message: 'Signature decoding failed',
			error: 'Bad Request',
		  },
		},
		alreadyInactive: {
		  summary: 'Vouch already revoked',
		  value: {
			statusCode: 400,
			message: 'Vouch is already inactive',
			error: 'Bad Request',
		  },
		},
	  },
	})
	@ApiUnauthorizedResponse({
	  description: 'Signature verification failed',
	  type: ErrorResponseDto,
	  examples: {
		invalidSignature: {
		  summary: 'Wallet signature is invalid',
		  value: {
			statusCode: 401,
			message: 'Invalid wallet signature',
			error: 'Unauthorized',
		  },
		},
	  },
	})
	@ApiNotFoundResponse({
	  description: 'Vouch not found or wallet mismatch',
	  type: ErrorResponseDto,
	  examples: {
		notFound: {
		  summary: 'Vouch does not exist or does not belong to wallet',
		  value: {
			statusCode: 404,
			message: 'Vouch not found or wallet mismatch',
			error: 'Not Found',
		  },
		},
	  },
	})
	async revokeVouch(
	  @Param('id') id: string,
	  @Body() body: RevokeVouchDto,
	) {
	  await this.vouchesService.revokeVouch(
		id,
		body.voucherWallet,
		body.signedMessage,
	  );
	}
  }