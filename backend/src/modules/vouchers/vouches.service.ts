import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Connection, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import nacl from 'tweetnacl';
import { PrismaService } from '../../prisma/prisma.service';
import { VoucherQualityService } from './voucher-quality.service';

/** Memo Program v1 (deprecated but still used) */
const MEMO_V1 = 'Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo';
/** Memo Program v2 (SPL Memo) */
const MEMO_V2 = 'MemoSq4ugJjltXmYYUsgPnvQUre2uZoana88Sfd3xc';

const VOUCH_BUDGET = 5;
const VOUCH_TTL_DAYS = 180;
const CLUSTER_WINDOW_MS = 86_400_000; // 24 h
const CLUSTER_THRESHOLD = 3;

export interface ConfirmVouchInput {
  /** GitHub username or User.username of the candidate being vouched for */
  candidateIdentifier: string;
  /** Solana wallet address of the person vouching */
  voucherWallet: string;
  /** Human-readable endorsement message */
  message: string;
  /** On-chain transaction signature that anchors this vouch */
  txSignature: string;
}

@Injectable()
export class VouchesService {
  private readonly logger = new Logger(VouchesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly voucherQualityService: VoucherQualityService,
    private readonly config: ConfigService,
  ) {}

  // ─── Public API ──────────────────────────────────────────────────────────

  async confirmVouch(input: ConfirmVouchInput) {
    const { candidateIdentifier, voucherWallet, message, txSignature } = input;

    // ── Step 0: Idempotency — bail early if tx already recorded ──────────
    const existing = await this.prisma.vouch.findUnique({
      where: { txSignature },
    });
    if (existing) {
      this.logger.log({ txSignature }, 'vouch_already_confirmed — idempotent return');
      return existing;
    }

    // ── Step 1: Candidate resolution ─────────────────────────────────────
    const candidate = await this.prisma.candidate.findFirst({
      where: {
        OR: [
          {
            devProfile: {
              githubProfile: { githubUsername: candidateIdentifier },
            },
          },
          {
            user: { username: candidateIdentifier },
          },
        ],
      },
      include: {
        devProfile: {
          include: { web3Profile: true },
        },
      },
    });

    if (!candidate) {
      throw new NotFoundException(
        `Candidate not found for identifier: ${candidateIdentifier}`,
      );
    }

	//TODO check wallet

    // ── Step 2: Hard block — self-vouch ───────────────────────────────────
    const candidateWallet = candidate.devProfile?.web3Profile?.walletAddress;
    if (candidateWallet && candidateWallet === voucherWallet) {
      throw new BadRequestException('Cannot vouch for yourself');
    }

    // ── Step 3: Hard block — duplicate vouch ─────────────────────────────
    const duplicateVouch = await this.prisma.vouch.findUnique({
      where: {
        candidateId_voucherWallet: {
          candidateId: candidate.id,
          voucherWallet,
        },
      },
    });
    if (duplicateVouch) {
      throw new BadRequestException('Already vouched for this candidate');
    }

    // ── Step 4: Budget check ──────────────────────────────────────────────
    const activeCount = await this.prisma.vouch.count({
      where: {
        voucherWallet,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
    });
    if (activeCount >= VOUCH_BUDGET) {
      throw new BadRequestException(
        'Vouch budget exhausted. Revoke an existing vouch to proceed.',
      );
    }

    // ── Step 5: On-chain verification ────────────────────────────────────
    await this.verifyOnChainTx(txSignature, voucherWallet, message);

    // ── Step 6: Weight assessment ─────────────────────────────────────────
    const weight =
      await this.voucherQualityService.assessVoucherWallet(voucherWallet);
    const expiresAt = new Date(Date.now() + VOUCH_TTL_DAYS * 86_400 * 1000);

    // ── Step 7: Create vouch record ───────────────────────────────────────
    const vouch = await this.prisma.vouch.create({
      data: {
        candidateId: candidate.id,
        voucherWallet,
        message,
        txSignature,
        weight,
        expiresAt,
        confirmedAt: new Date(),
      },
    });

    this.logger.log(
      { vouchId: vouch.id, candidateId: candidate.id, weight },
      'vouch_confirmed',
    );

    // ── Step 8: Cluster detection (async, non-blocking) ──────────────────
    setImmediate(() =>
      this.runClusterCheck(candidate.id, voucherWallet).catch((err) =>
        this.logger.warn({ err }, 'cluster_check_error'),
      ),
    );

    return vouch;
  }

  /**
   * Revokes a vouch by marking it inactive.
   * Requires a valid wallet signature to prove ownership.
   */
  async revokeVouch(
    vouchId: string,
    voucherWallet: string,
    signedMessage: string,
  ): Promise<void> {
    // ── 1. Signature Verification ────────────────────────────────────────
    try {
      const expectedMsg = Buffer.from(`revoke-vouch:${vouchId}`);
      const sigBytes = bs58.decode(signedMessage);
      const pubkeyBytes = new PublicKey(voucherWallet).toBytes();

      const isValid = nacl.sign.detached.verify(
        expectedMsg,
        sigBytes,
        pubkeyBytes,
      );

      if (!isValid) {
        throw new UnauthorizedException('Invalid wallet signature');
      }
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new BadRequestException(`Signature decoding failed: ${(err as Error).message}`);
    }

    // ── 2. Ownership & Status Checks ──────────────────────────────────────
    const vouch = await this.prisma.vouch.findUnique({
      where: { id: vouchId },
    });

    if (!vouch || vouch.voucherWallet !== voucherWallet) {
      throw new NotFoundException('Vouch not found or wallet mismatch');
    }

    if (!vouch.isActive) {
      throw new BadRequestException('Vouch is already inactive');
    }

    // ── 3. Deactivate ──────────────────────────────────────────────────
    await this.prisma.vouch.update({
      where: { id: vouchId },
      data: {
        isActive: false,
        revokedAt: new Date(),
      },
    });

    this.logger.log({ vouchId, voucherWallet }, 'vouch_revoked');
  }

  // ─── Private helpers ─────────────────────────────────────────────────────

  /**
   * Real on-chain verification:
   * 1. Fetches the confirmed transaction via RPC.
   * 2. Asserts the fee payer matches `voucherWallet`.
   * 3. Finds a Memo v1 or v2 instruction whose text equals `message`.
   *
   * Handles both legacy (Message) and versioned (MessageV0) transaction types.
   */
  private async verifyOnChainTx(
    txSignature: string,
    voucherWallet: string,
    message: string,
  ): Promise<void> {
    if (!message || !message.trim()) {
      throw new BadRequestException('Message must not be empty');
    }

    const rpcUrl = this.config.get<string>('SOLANA_RPC_URL');
    if (!rpcUrl) {
      throw new BadRequestException(
        'SOLANA_RPC_URL not configured — cannot verify transaction',
      );
    }

    const connection = new Connection(rpcUrl, 'confirmed');

    let tx: Awaited<ReturnType<Connection['getTransaction']>>;
    try {
      tx = await connection.getTransaction(txSignature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });
    } catch (err) {
      throw new BadRequestException(
        `Failed to fetch transaction: ${(err as Error).message}`,
      );
    }

    if (!tx) {
      throw new BadRequestException(
        `Transaction ${txSignature} not found on chain`,
      );
    }

    if (tx.meta?.err) {
      throw new BadRequestException(
        `Transaction ${txSignature} failed on chain: ${JSON.stringify(tx.meta.err)}`,
      );
    }

    // ── 1. Fee-payer check ──────────────────────────────────────────────
    // For legacy messages: accountKeys[]. For versioned: staticAccountKeys[].
    const msg = tx.transaction.message as any;
    const accountKeys: PublicKey[] =
      msg.staticAccountKeys ?? msg.accountKeys ?? [];

    const feePayer = accountKeys[0]?.toBase58();
    if (!feePayer || feePayer !== voucherWallet) {
      throw new BadRequestException(
        `Transaction fee payer (${feePayer ?? 'unknown'}) does not match voucherWallet`,
      );
    }

    // ── 2. Memo instruction check ────────────────────────────────────────
    // compiledInstructions exists on versioned messages (MessageV0);
    // instructions exists on legacy messages.
    const instructions: Array<{ programIdIndex: number; data: Uint8Array | string }> =
      msg.compiledInstructions ?? msg.instructions ?? [];

    const memoMatch = instructions.some((ix) => {
      const programId = accountKeys[ix.programIdIndex]?.toBase58();
      if (programId !== MEMO_V1 && programId !== MEMO_V2) return false;

      // data is Uint8Array on versioned txs, base58-string on legacy txs.
      const memoText =
        ix.data instanceof Uint8Array || Buffer.isBuffer(ix.data)
          ? Buffer.from(ix.data).toString('utf8')
          : Buffer.from(bs58.decode(ix.data as string)).toString('utf8');

      return memoText === message;
    });

    if (!memoMatch) {
      throw new BadRequestException(
        'No Memo instruction found whose text matches the provided message',
      );
    }

    this.logger.debug(
      { txSignature, voucherWallet },
      'on_chain_verify_ok',
    );
  }

  /**
   * Async cluster detection — flags a batch of recent vouches as
   * 'cluster_detected' when ≥ 3 new-wallet vouches hit the same candidate
   * within 24 h.
   */
  async runClusterCheck(
    candidateId: string,
    _voucherWallet: string,
  ): Promise<void> {
    const last24h = new Date(Date.now() - CLUSTER_WINDOW_MS);

    const recent = await this.prisma.vouch.findMany({
      where: {
        candidateId,
        confirmedAt: { gte: last24h },
        flag: null,
      },
    });

    if (recent.length < CLUSTER_THRESHOLD) return;

    // Count how many of the recent vouching wallets are classified as 'new'
    let newWalletCount = 0;
    for (const vouch of recent) {
      const quality = await this.voucherQualityService.assessVoucherWallet(
        vouch.voucherWallet,
      );
      if (quality === 'new') newWalletCount++;
    }

    if (newWalletCount >= CLUSTER_THRESHOLD) {
      await this.prisma.vouch.updateMany({
        where: {
          id: { in: recent.map((v) => v.id) },
          flag: null,
        },
        data: {
          isActive: false,
          flag: 'cluster_detected',
        },
      });

      this.logger.warn(
        { candidateId, count: recent.length, newWalletCount },
        'cluster_detected',
      );
    }
  }
}
