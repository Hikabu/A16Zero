import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { createHash } from 'crypto';

export interface EscrowOnChainState {
  employer: string;
  candidate: string | null;
  amount: string;
  released: boolean;
}

const ESCROW_PROGRAM_ID = new PublicKey(
  '4jmvrfqG2Mhx9Wc92NaJvXwzNp2d6xAHFfymz6N3x1Ar',
);

const ESCROW_DISCRIMINATOR = createHash('sha256')
  .update('account:Escrow')
  .digest()
  .subarray(0, 8);

@Injectable()
export class SolanaService {
  private readonly connection: Connection;

  constructor(private readonly config: ConfigService) {
    const rpcUrl =
      this.config.get<string>('SOLANA_DEVNET_RPC_URL') ||
      this.config.get<string>('SOLANA_RPC_URL') ||
      clusterApiUrl('devnet');

    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  derivePDA(employerPubkey: string, escrowId: bigint): string {
    const employer = this.publicKeyFromString(employerPubkey, 'employerPubkey');
    const escrowIdBytes = Buffer.alloc(8);
    escrowIdBytes.writeBigUInt64LE(escrowId);

    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from('escrow'), employer.toBuffer(), escrowIdBytes],
      ESCROW_PROGRAM_ID,
    );

    return pda.toBase58();
  }

  async verifyEscrowFunded(
    address: string,
    expectedAmount: bigint,
  ): Promise<EscrowOnChainState> {
    const state = await this.getEscrowState(address);

    if (state.released) {
      throw new BadRequestException('Escrow is already released or refunded');
    }

    if (BigInt(state.amount) !== expectedAmount) {
      throw new BadRequestException('On-chain escrow amount mismatch');
    }

    return state;
  }

  async getEscrowState(address: string): Promise<EscrowOnChainState> {
    const escrowAddress = this.publicKeyFromString(address, 'escrowAddress');
    const account = await this.connection.getAccountInfo(escrowAddress);

    if (!account) {
      throw new NotFoundException('Escrow account not found on-chain');
    }

    if (!account.owner.equals(ESCROW_PROGRAM_ID)) {
      throw new BadRequestException(
        'Escrow account is not owned by escrow program',
      );
    }

    return this.decodeEscrowAccount(account.data);
  }

  validatePublicKey(value: string, fieldName: string): string {
    return this.publicKeyFromString(value, fieldName).toBase58();
  }

  private decodeEscrowAccount(data: Buffer): EscrowOnChainState {
    const minimumEmptyCandidateLength = 8 + 32 + 1 + 8 + 1 + 1 + 1;
    if (data.length < minimumEmptyCandidateLength) {
      throw new BadRequestException('Escrow account data is too short');
    }

    if (!data.subarray(0, 8).equals(ESCROW_DISCRIMINATOR)) {
      throw new BadRequestException('Escrow account discriminator mismatch');
    }

    let offset = 8;
    const employer = new PublicKey(data.subarray(offset, offset + 32));
    offset += 32;

    const candidateTag = data.readUInt8(offset);
    offset += 1;

    let candidate: PublicKey | null = null;
    if (candidateTag === 1) {
      if (data.length < offset + 32 + 8 + 1 + 1 + 1) {
        throw new BadRequestException(
          'Escrow account candidate data is too short',
        );
      }
      candidate = new PublicKey(data.subarray(offset, offset + 32));
      offset += 32;
    } else if (candidateTag !== 0) {
      throw new BadRequestException(
        'Escrow account candidate option is invalid',
      );
    }

    if (data.length < offset + 8 + 1 + 1 + 1) {
      throw new BadRequestException('Escrow account data is truncated');
    }

    const amount = data.readBigUInt64LE(offset);
    offset += 8;

    offset += 2; // bump and vault_bump are not part of backend mirror state.

    const releasedByte = data.readUInt8(offset);
    if (releasedByte !== 0 && releasedByte !== 1) {
      throw new BadRequestException('Escrow account released flag is invalid');
    }

    return {
      employer: employer.toBase58(),
      candidate: candidate?.toBase58() ?? null,
      amount: amount.toString(),
      released: releasedByte === 1,
    };
  }

  private publicKeyFromString(value: string, fieldName: string): PublicKey {
    try {
      return new PublicKey(value);
    } catch {
      throw new BadRequestException(
        `${fieldName} must be a valid Solana public key`,
      );
    }
  }
}
