import * as anchor from "@anchor-lang/core";
import { Program } from "@anchor-lang/core";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccount,
  createMint,
  getAccount,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { assert } from "chai";
import { Escrow } from "../target/types/escrow";

const USDT_MINT = new anchor.web3.PublicKey(
  "29NaQXG4m9LYBgptcDrpm4fUCkehFiToSgDWjPbcC4GD"
);
const PLATFORM_WALLET = new anchor.web3.PublicKey(
  "E3QW5XjxFax9Jx4Wvd9Pqwyrvr8ySB1Rp43bVCYvzvDj"
);
const DEPOSIT = 1_000_000n;

type TestContext = {
  escrowId: anchor.BN;
  employer: anchor.web3.Keypair;
  candidate: anchor.web3.Keypair;
  attacker: anchor.web3.Keypair;
  escrow: anchor.web3.PublicKey;
  vault: anchor.web3.PublicKey;
  employerAta: anchor.web3.PublicKey;
  candidateAta: anchor.web3.PublicKey;
  platformAta: anchor.web3.PublicKey;
  wrongMint: anchor.web3.PublicKey;
  wrongMintAta: anchor.web3.PublicKey;
};

describe("escrow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Escrow as Program<Escrow>;
  const payer = (provider.wallet as anchor.Wallet).payer;
  let nextEscrowId = 1n;

  async function confirm(signature: string) {
    const latest = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction(
      {
        signature,
        blockhash: latest.blockhash,
        lastValidBlockHeight: latest.lastValidBlockHeight,
      },
      "confirmed"
    );
  }

  async function airdrop(
    pubkey: anchor.web3.PublicKey,
    lamports = 2_000_000_000
  ) {
    await confirm(await provider.connection.requestAirdrop(pubkey, lamports));
  }

  async function expectFailure(action: Promise<unknown>, code?: string) {
    try {
      await action;
      assert.fail(code ? `Expected ${code}` : "Expected transaction to fail");
    } catch (error) {
      if (!code) {
        return;
      }

      const err = error as anchor.AnchorError;
      assert.isDefined(err.error, `Expected Anchor error ${code}: ${error}`);
      assert.equal(err.error.errorCode.code, code);
    }
  }

  function deriveEscrow(
    employer: anchor.web3.PublicKey,
    escrowId: anchor.BN
  ): anchor.web3.PublicKey {
    const id = Buffer.alloc(8);
    id.writeBigUInt64LE(BigInt(escrowId.toString()));
    return anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), employer.toBuffer(), id],
      program.programId
    )[0];
  }

  async function initializeContext(amount = DEPOSIT): Promise<TestContext> {
    const escrowId = new anchor.BN(nextEscrowId.toString());
    nextEscrowId += 1n;

    const employer = anchor.web3.Keypair.generate();
    const candidate = anchor.web3.Keypair.generate();
    const attacker = anchor.web3.Keypair.generate();

    await airdrop(provider.wallet.publicKey, 5_000_000_000);
    await airdrop(employer.publicKey);
    await airdrop(attacker.publicKey);

    const wrongMint = await createMint(
      provider.connection,
      payer,
      provider.wallet.publicKey,
      null,
      6
    );

    const employerAta = await createAssociatedTokenAccount(
      provider.connection,
      payer,
      USDT_MINT,
      employer.publicKey
    );
    const candidateAta = await createAssociatedTokenAccount(
      provider.connection,
      payer,
      USDT_MINT,
      candidate.publicKey
    );
    const platformAta = (
      await getOrCreateAssociatedTokenAccount(
        provider.connection,
        payer,
        USDT_MINT,
        PLATFORM_WALLET
      )
    ).address;
    const wrongMintAta = await createAssociatedTokenAccount(
      provider.connection,
      payer,
      wrongMint,
      PLATFORM_WALLET
    );

    await mintTo(
      provider.connection,
      payer,
      USDT_MINT,
      employerAta,
      provider.wallet.publicKey,
      amount * 10n
    );

    const escrow = deriveEscrow(employer.publicKey, escrowId);
    const vault = getAssociatedTokenAddressSync(
      USDT_MINT,
      escrow,
      true,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    return {
      escrowId,
      employer,
      candidate,
      attacker,
      escrow,
      vault,
      employerAta,
      candidateAta,
      platformAta,
      wrongMint,
      wrongMintAta,
    };
  }

  async function createEscrow(ctx: TestContext, amount = DEPOSIT) {
    await program.methods
      .createEscrow(ctx.escrowId, new anchor.BN(amount.toString()))
      .accounts({
        employer: ctx.employer.publicKey,
        escrow: ctx.escrow,
        vault: ctx.vault,
        employerAta: ctx.employerAta,
        usdtMint: USDT_MINT,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([ctx.employer])
      .rpc();
  }

  async function setCandidate(ctx: TestContext) {
    await program.methods
      .setCandidate(ctx.escrowId, ctx.candidate.publicKey)
      .accounts({
        escrow: ctx.escrow,
        employer: ctx.employer.publicKey,
      })
      .signers([ctx.employer])
      .rpc();
  }

  async function release(ctx: TestContext, signer = ctx.employer) {
    return program.methods
      .release(ctx.escrowId)
      .accounts({
        escrow: ctx.escrow,
        employer: signer.publicKey,
        vault: ctx.vault,
        platformAta: ctx.platformAta,
        candidateAta: ctx.candidateAta,
        usdtMint: USDT_MINT,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([signer])
      .rpc();
  }

  async function refund(ctx: TestContext, signer = ctx.employer) {
    return program.methods
      .refund(ctx.escrowId)
      .accounts({
        escrow: ctx.escrow,
        employer: signer.publicKey,
        vault: ctx.vault,
        platformAta: ctx.platformAta,
        employerAta: ctx.employerAta,
        usdtMint: USDT_MINT,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([signer])
      .rpc();
  }

  it("creates multiple escrows for one employer and locks USDT in escrow-owned vault ATAs", async () => {
    const ctx = await initializeContext();
    const secondId = new anchor.BN(nextEscrowId.toString());
    nextEscrowId += 1n;
    const secondEscrow = deriveEscrow(ctx.employer.publicKey, secondId);
    const secondVault = getAssociatedTokenAddressSync(
      USDT_MINT,
      secondEscrow,
      true,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    await createEscrow(ctx);
    await program.methods
      .createEscrow(secondId, new anchor.BN(DEPOSIT.toString()))
      .accounts({
        employer: ctx.employer.publicKey,
        escrow: secondEscrow,
        vault: secondVault,
        employerAta: ctx.employerAta,
        usdtMint: USDT_MINT,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([ctx.employer])
      .rpc();

    const firstVault = await getAccount(provider.connection, ctx.vault);
    const secondVaultAccount = await getAccount(
      provider.connection,
      secondVault
    );
    const state = await program.account.escrow.fetch(ctx.escrow);

    assert.equal(firstVault.amount, DEPOSIT);
    assert.equal(secondVaultAccount.amount, DEPOSIT);
    assert.equal(firstVault.owner.toBase58(), ctx.escrow.toBase58());
    assert.equal(secondVaultAccount.owner.toBase58(), secondEscrow.toBase58());
    assert.equal(state.employer.toBase58(), ctx.employer.publicKey.toBase58());
    assert.equal(state.amount.toString(), DEPOSIT.toString());
    assert.isNull(state.candidate);
    assert.isFalse(state.released);
  });

  it("sets candidate once", async () => {
    const ctx = await initializeContext();
    await createEscrow(ctx);

    await setCandidate(ctx);

    const state = await program.account.escrow.fetch(ctx.escrow);
    assert.equal(
      state.candidate.toBase58(),
      ctx.candidate.publicKey.toBase58()
    );

    await expectFailure(
      program.methods
        .setCandidate(ctx.escrowId, ctx.attacker.publicKey)
        .accounts({
          escrow: ctx.escrow,
          employer: ctx.employer.publicKey,
        })
        .signers([ctx.employer])
        .rpc(),
      "CandidateAlreadySet"
    );
  });

  it("releases 99% to candidate, 1% to platform, and closes the vault", async () => {
    const ctx = await initializeContext();
    await createEscrow(ctx);
    await setCandidate(ctx);
    const platformBefore = await getAccount(
      provider.connection,
      ctx.platformAta
    );

    await release(ctx);

    const candidateAccount = await getAccount(
      provider.connection,
      ctx.candidateAta
    );
    const platformAccount = await getAccount(
      provider.connection,
      ctx.platformAta
    );
    const state = await program.account.escrow.fetch(ctx.escrow);

    assert.equal(candidateAccount.amount, 990_000n);
    assert.equal(platformAccount.amount - platformBefore.amount, 10_000n);
    assert.isTrue(state.released);
    await expectFailure(getAccount(provider.connection, ctx.vault));
  });

  it("refunds 99% to employer, 1% to platform, and closes the vault", async () => {
    const ctx = await initializeContext();
    await createEscrow(ctx);
    const platformBefore = await getAccount(
      provider.connection,
      ctx.platformAta
    );

    await refund(ctx);

    const employerAccount = await getAccount(
      provider.connection,
      ctx.employerAta
    );
    const platformAccount = await getAccount(
      provider.connection,
      ctx.platformAta
    );

    assert.equal(employerAccount.amount, DEPOSIT * 10n - DEPOSIT + 990_000n);
    assert.equal(platformAccount.amount - platformBefore.amount, 10_000n);
    await expectFailure(getAccount(provider.connection, ctx.vault));
  });

  it("fails release without candidate", async () => {
    const ctx = await initializeContext();
    await createEscrow(ctx);

    await expectFailure(release(ctx), "CandidateNotSet");
  });

  it("fails when a non-employer tries to release or refund", async () => {
    const releaseCtx = await initializeContext();
    await createEscrow(releaseCtx);
    await setCandidate(releaseCtx);

    await expectFailure(release(releaseCtx, releaseCtx.attacker));

    const refundCtx = await initializeContext();
    await createEscrow(refundCtx);

    await expectFailure(refund(refundCtx, refundCtx.attacker));
  });

  it("fails double release", async () => {
    const ctx = await initializeContext();
    await createEscrow(ctx);
    await setCandidate(ctx);
    await release(ctx);

    await expectFailure(release(ctx));
  });

  it("fails create escrow with wrong mint", async () => {
    const ctx = await initializeContext();

    await expectFailure(
      program.methods
        .createEscrow(ctx.escrowId, new anchor.BN(DEPOSIT.toString()))
        .accounts({
          employer: ctx.employer.publicKey,
          escrow: ctx.escrow,
          vault: ctx.vault,
          employerAta: ctx.employerAta,
          usdtMint: ctx.wrongMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([ctx.employer])
        .rpc()
    );
  });

  it("fails release with wrong mint ATA", async () => {
    const ctx = await initializeContext();
    await createEscrow(ctx);
    await setCandidate(ctx);

    await expectFailure(
      program.methods
        .release(ctx.escrowId)
        .accounts({
          escrow: ctx.escrow,
          employer: ctx.employer.publicKey,
          vault: ctx.vault,
          platformAta: ctx.wrongMintAta,
          candidateAta: ctx.candidateAta,
          usdtMint: USDT_MINT,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([ctx.employer])
        .rpc(),
      "WrongMint"
    );
  });

  it("fails with wrong token program", async () => {
    const ctx = await initializeContext();

    await expectFailure(
      program.methods
        .createEscrow(ctx.escrowId, new anchor.BN(DEPOSIT.toString()))
        .accounts({
          employer: ctx.employer.publicKey,
          escrow: ctx.escrow,
          vault: ctx.vault,
          employerAta: ctx.employerAta,
          usdtMint: USDT_MINT,
          tokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([ctx.employer])
        .rpc()
    );
  });
});
