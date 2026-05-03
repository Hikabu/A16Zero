import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EscrowStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SolanaService } from './solana.service';
import {
  ConfirmFundedDto,
  ConfirmResolvedDto,
  SetCandidateDto,
} from './dto/escrow.dto';

@Injectable()
export class EscrowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly solana: SolanaService,
  ) {}

  async confirmFunded(companyId: string, dto: ConfirmFundedDto) {
    const escrowId = this.parseU64(dto.escrowId, 'escrowId');
    const expectedAmount = this.parseU64(dto.expectedAmount, 'expectedAmount');
    if (expectedAmount <= 0n || expectedAmount % 100n !== 0n) {
      throw new BadRequestException(
        'expectedAmount must be positive and divisible by 100',
      );
    }

    const job = await this.getCompanyJob(dto.jobPostId, companyId);
    const employerWallet = job.company.walletAddress;
    if (!employerWallet) {
      throw new BadRequestException('Employer company has no wallet address');
    }

    const derivedAddress = this.solana.derivePDA(employerWallet, escrowId);
    if (derivedAddress !== dto.escrowAddress) {
      throw new BadRequestException(
        'Client escrow address does not match derived PDA',
      );
    }

    const onChainState = await this.solana.verifyEscrowFunded(
      derivedAddress,
      expectedAmount,
    );

    if (onChainState.employer !== employerWallet) {
      throw new BadRequestException(
        'On-chain employer does not match company wallet',
      );
    }

    const updated = await this.prisma.jobPost.update({
      where: { id: job.id },
      data: {
        escrowId,
        escrowAddress: derivedAddress,
        escrowStatus: EscrowStatus.FUNDED,
      },
    });

    return this.serializeJob(updated);
  }

  async setCandidate(companyId: string, dto: SetCandidateDto) {
    const job = await this.getCompanyJob(dto.jobPostId, companyId);
    if (job.escrowStatus !== EscrowStatus.FUNDED) {
      throw new BadRequestException(
        'Escrow must be FUNDED before setting candidate',
      );
    }
    if (!job.escrowAddress) {
      throw new BadRequestException('Job post has no escrow address');
    }

    const escrowAddress = this.verifiedStoredEscrowAddress(job);
    const candidateWallet = this.solana.validatePublicKey(
      dto.candidateWallet,
      'candidateWallet',
    );
    const onChainState = await this.solana.getEscrowState(escrowAddress);
    this.ensureEmployerMatches(
      job.company.walletAddress,
      onChainState.employer,
    );
    if (onChainState.released) {
      throw new BadRequestException('Escrow is already resolved on-chain');
    }
    if (onChainState.candidate !== candidateWallet) {
      throw new BadRequestException(
        'On-chain candidate does not match candidateWallet',
      );
    }

    const updated = await this.prisma.jobPost.update({
      where: { id: job.id },
      data: { candidateWallet },
    });

    return this.serializeJob(updated);
  }

  async confirmReleased(companyId: string, dto: ConfirmResolvedDto) {
    return this.confirmResolved(
      companyId,
      dto.jobPostId,
      EscrowStatus.RELEASED,
    );
  }

  async confirmRefunded(companyId: string, dto: ConfirmResolvedDto) {
    return this.confirmResolved(
      companyId,
      dto.jobPostId,
      EscrowStatus.REFUNDED,
    );
  }

  async status(companyId: string, jobPostId: string) {
    const job = await this.getCompanyJob(jobPostId, companyId);
    const onChainState = job.escrowAddress
      ? await this.solana.getEscrowState(job.escrowAddress)
      : null;

    return {
      dbState: {
        jobPostId: job.id,
        escrowId: job.escrowId?.toString() ?? null,
        escrowAddress: job.escrowAddress,
        candidateWallet: job.candidateWallet,
        escrowStatus: job.escrowStatus,
      },
      onChainState,
    };
  }

  private async confirmResolved(
    companyId: string,
    jobPostId: string,
    status: EscrowStatus,
  ) {
    const job = await this.getCompanyJob(jobPostId, companyId);
    if (!job.escrowAddress) {
      throw new BadRequestException('Job post has no escrow address');
    }

    const escrowAddress = this.verifiedStoredEscrowAddress(job);
    const onChainState = await this.solana.getEscrowState(escrowAddress);
    this.ensureEmployerMatches(
      job.company.walletAddress,
      onChainState.employer,
    );
    if (!onChainState.released) {
      throw new BadRequestException('Escrow is not resolved on-chain');
    }

    const updated = await this.prisma.jobPost.update({
      where: { id: job.id },
      data: { escrowStatus: status },
    });

    return this.serializeJob(updated);
  }

  private async getCompanyJob(jobPostId: string, companyId: string) {
    const job = await this.prisma.jobPost.findUnique({
      where: { id: jobPostId },
      include: { company: true },
    });

    if (!job || job.companyId !== companyId) {
      throw new NotFoundException('Job post not found');
    }

    return job;
  }

  private verifiedStoredEscrowAddress(
    job: Awaited<ReturnType<EscrowService['getCompanyJob']>>,
  ) {
    if (!job.escrowId || !job.escrowAddress) {
      throw new BadRequestException('Job post has no escrow PDA recorded');
    }
    if (!job.company.walletAddress) {
      throw new BadRequestException('Employer company has no wallet address');
    }

    const derivedAddress = this.solana.derivePDA(
      job.company.walletAddress,
      job.escrowId,
    );
    if (derivedAddress !== job.escrowAddress) {
      throw new BadRequestException(
        'Stored escrow address does not match derived PDA',
      );
    }

    return derivedAddress;
  }

  private ensureEmployerMatches(
    employerWallet: string | null,
    onChainEmployer: string,
  ) {
    if (!employerWallet || employerWallet !== onChainEmployer) {
      throw new BadRequestException(
        'On-chain employer does not match company wallet',
      );
    }
  }

  private parseU64(value: string, fieldName: string): bigint {
    const parsed = BigInt(value);
    if (parsed < 0n || parsed > 18_446_744_073_709_551_615n) {
      throw new BadRequestException(`${fieldName} must fit in u64`);
    }
    return parsed;
  }

  private serializeJob<T extends { escrowId: bigint | null }>(job: T) {
    return {
      ...job,
      escrowId: job.escrowId?.toString() ?? null,
    };
  }
}
