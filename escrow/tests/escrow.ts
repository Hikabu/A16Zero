import * as anchor from "@anchor-lang/core";
import { Program } from "@anchor-lang/core";
import {
  createAssociatedTokenAccount,
  createMint,
  getAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { assert } from "chai";
import { Escrow } from "../target/types/escrow";

const PLATFORM_WALLET = new anchor.web3.PublicKey(
  "E3QW5XjxFax9Jx4Wvd9Pqwyrvr8ySB1Rp43bVCYvzvDj",
);
const DEPOSIT = 1_000_000n;
const ZERO = new anchor.web3.PublicKey("11111111111111111111111111111111");

type TestContext = {
  employer: anchor.web3.Keypair;
  candidate: anchor.web3.Keypair;
  wrongCandidate: anchor.web3.Keypair;
  usdtMint: anchor.web3.PublicKey;
  employerTokenAccount: anchor.web3.PublicKey;
  platformTokenAccount: anchor.web3.PublicKey;
  candidateTokenAccount: anchor.web3.PublicKey;
  wrongCandidateTokenAccount: anchor.web3.PublicKey;
  wrongMintTokenAccount: anchor.web3.PublicKey;
  escrowPda: anchor.web3.PublicKey;
  vaultPda: anchor.web3.PublicKey;
};

describe("escrow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Escrow as Program<Escrow>;

  async function confirm(signature: string) {
    const latest = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction(
      {
        signature,
        blockhash: latest.blockhash,
        lastValidBlockHeight: latest.lastValidBlockHeight,
      },
      "confirmed",
    );
  }

  async function expectAnchorError(
    action: Promise<unknown>,
    code: string,
  ): Promise<void> {
    try {
      await action;
      assert.fail(`Expected Anchor error ${code}`);
    } catch (error) {
      const err = error as anchor.AnchorError;
      assert.equal(err.error.errorCode.code, code);
    }
  }

  async function initializeContext(amount = DEPOSIT): Promise<TestContext> {
    const payer = (provider.wallet as anchor.Wallet).payer;
    const employer = anchor.web3.Keypair.generate();
    const candidate = anchor.web3.Keypair.generate();
    const wrongCandidate = anchor.web3.Keypair.generate();

    await confirm(
      await provider.connection.requestAirdrop(
        provider.wallet.publicKey,
        5_000_000_000,
      ),
    );
    await confirm(
      await provider.connection.requestAirdrop(employer.publicKey, 2_000_000_000),
    );

    const usdtMint = await createMint(
      provider.connection,
      payer,
      provider.wallet.publicKey,
      null,
      6,
    );
    const wrongMint = await createMint(
      provider.connection,
      payer,
      provider.wallet.publicKey,
      null,
      6,
    );

    const employerTokenAccount = await createAssociatedTokenAccount(
      provider.connection,
      payer,
      usdtMint,
      employer.publicKey,
    );
    const platformTokenAccount = await createAssociatedTokenAccount(
      provider.connection,
      payer,
      usdtMint,
      PLATFORM_WALLET,
    );
    const candidateTokenAccount = await createAssociatedTokenAccount(
      provider.connection,
      payer,
      usdtMint,
      candidate.publicKey,
    );
    const wrongCandidateTokenAccount = await createAssociatedTokenAccount(
      provider.connection,
      payer,
      usdtMint,
      wrongCandidate.publicKey,
    );
    const wrongMintTokenAccount = await createAssociatedTokenAccount(
      provider.connection,
      payer,
      wrongMint,
      PLATFORM_WALLET,
    );

    await mintTo(
      provider.connection,
      payer,
      usdtMint,
      employerTokenAccount,
      provider.wallet.publicKey,
      amount * 10n,
    );

    const [escrowPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), employer.publicKey.toBuffer()],
      program.programId,
    );
    const [vaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), employer.publicKey.toBuffer()],
      program.programId,
    );

    return {
      employer,
      candidate,
      wrongCandidate,
      usdtMint,
      employerTokenAccount,
      platformTokenAccount,
      candidateTokenAccount,
      wrongCandidateTokenAccount,
      wrongMintTokenAccount,
      escrowPda,
      vaultPda,
    };
  }

  async function initializeEscrow(ctx: TestContext, amount = DEPOSIT) {
    await program.methods
      .initialize(new anchor.BN(amount.toString()))
      .accounts({
        employer: ctx.employer.publicKey,
        escrowState: ctx.escrowPda,
        vault: ctx.vaultPda,
        employerTokenAccount: ctx.employerTokenAccount,
        platformTokenAccount: ctx.platformTokenAccount,
        usdtMint: ctx.usdtMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([ctx.employer])
      .rpc();
  }

  async function setCandidate(ctx: TestContext) {
    await program.methods
      .setCandidate(ctx.candidate.publicKey)
      .accounts({
        employer: ctx.employer.publicKey,
        escrowState: ctx.escrowPda,
      })
      .signers([ctx.employer])
      .rpc();
  }

  it("initializes escrow and locks the employer deposit in the vault", async () => {
    const ctx = await initializeContext();

    await initializeEscrow(ctx);

    const vault = await getAccount(provider.connection, ctx.vaultPda);
    const state = await program.account.escrowState.fetch(ctx.escrowPda);

    assert.equal(vault.amount, DEPOSIT);
    assert.equal(vault.owner.toBase58(), ctx.escrowPda.toBase58());
    assert.equal(state.employer.toBase58(), ctx.employer.publicKey.toBase58());
    assert.equal(state.depositedAmount.toString(), DEPOSIT.toString());
    assert.deepEqual(state.status, { active: {} });
  });

  it("sets the candidate while the escrow is active", async () => {
    const ctx = await initializeContext();
    await initializeEscrow(ctx);

    await setCandidate(ctx);

    const state = await program.account.escrowState.fetch(ctx.escrowPda);
    assert.equal(state.candidate.toBase58(), ctx.candidate.publicKey.toBase58());
  });

  it("releases 99% to the candidate and 1% to the platform", async () => {
    const ctx = await initializeContext();
    await initializeEscrow(ctx);
    await setCandidate(ctx);

    await program.methods
      .release()
      .accounts({
        employer: ctx.employer.publicKey,
        escrowState: ctx.escrowPda,
        vault: ctx.vaultPda,
        candidateTokenAccount: ctx.candidateTokenAccount,
        platformTokenAccount: ctx.platformTokenAccount,
        usdtMint: ctx.usdtMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([ctx.employer])
      .rpc();

    const candidateAccount = await getAccount(
      provider.connection,
      ctx.candidateTokenAccount,
    );
    const platformAccount = await getAccount(
      provider.connection,
      ctx.platformTokenAccount,
    );
    const vault = await getAccount(provider.connection, ctx.vaultPda);
    const state = await program.account.escrowState.fetch(ctx.escrowPda);

    assert.equal(candidateAccount.amount, 990_000n);
    assert.equal(platformAccount.amount, 10_000n);
    assert.equal(vault.amount, 0n);
    assert.deepEqual(state.status, { released: {} });
  });

  it("refunds 93% to the employer and 7% to the platform", async () => {
    const ctx = await initializeContext();
    await initializeEscrow(ctx);

    await program.methods
      .refund()
      .accounts({
        employer: ctx.employer.publicKey,
        escrowState: ctx.escrowPda,
        vault: ctx.vaultPda,
        employerTokenAccount: ctx.employerTokenAccount,
        platformTokenAccount: ctx.platformTokenAccount,
        usdtMint: ctx.usdtMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([ctx.employer])
      .rpc();

    const employerAccount = await getAccount(
      provider.connection,
      ctx.employerTokenAccount,
    );
    const platformAccount = await getAccount(
      provider.connection,
      ctx.platformTokenAccount,
    );
    const vault = await getAccount(provider.connection, ctx.vaultPda);
    const state = await program.account.escrowState.fetch(ctx.escrowPda);

    assert.equal(employerAccount.amount, DEPOSIT * 10n - DEPOSIT + 930_000n);
    assert.equal(platformAccount.amount, 70_000n);
    assert.equal(vault.amount, 0n);
    assert.deepEqual(state.status, { refunded: {} });
  });

  it("rejects a zero deposit", async () => {
    const ctx = await initializeContext();

    await expectAnchorError(initializeEscrow(ctx, 0n), "ZeroAmount");
  });

  it("rejects initialize when the platform token account owner is not hardcoded platform wallet", async () => {
    const ctx = await initializeContext();

    await expectAnchorError(
      program.methods
        .initialize(new anchor.BN(DEPOSIT.toString()))
        .accounts({
          employer: ctx.employer.publicKey,
          escrowState: ctx.escrowPda,
          vault: ctx.vaultPda,
          employerTokenAccount: ctx.employerTokenAccount,
          platformTokenAccount: ctx.wrongCandidateTokenAccount,
          usdtMint: ctx.usdtMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([ctx.employer])
        .rpc(),
      "InvalidPlatformWallet",
    );
  });

  it("rejects a default candidate address", async () => {
    const ctx = await initializeContext();
    await initializeEscrow(ctx);

    await expectAnchorError(
      program.methods
        .setCandidate(ZERO)
        .accounts({
          employer: ctx.employer.publicKey,
          escrowState: ctx.escrowPda,
        })
        .signers([ctx.employer])
        .rpc(),
      "InvalidCandidate",
    );
  });

  it("rejects release before a candidate is set", async () => {
    const ctx = await initializeContext();
    await initializeEscrow(ctx);

    await expectAnchorError(
      program.methods
        .release()
        .accounts({
          employer: ctx.employer.publicKey,
          escrowState: ctx.escrowPda,
          vault: ctx.vaultPda,
          candidateTokenAccount: ctx.candidateTokenAccount,
          platformTokenAccount: ctx.platformTokenAccount,
          usdtMint: ctx.usdtMint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([ctx.employer])
        .rpc(),
      "CandidateNotSet",
    );
  });

  it("rejects release to a token account owned by another candidate", async () => {
    const ctx = await initializeContext();
    await initializeEscrow(ctx);
    await setCandidate(ctx);

    await expectAnchorError(
      program.methods
        .release()
        .accounts({
          employer: ctx.employer.publicKey,
          escrowState: ctx.escrowPda,
          vault: ctx.vaultPda,
          candidateTokenAccount: ctx.wrongCandidateTokenAccount,
          platformTokenAccount: ctx.platformTokenAccount,
          usdtMint: ctx.usdtMint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([ctx.employer])
        .rpc(),
      "WrongCandidateAccount",
    );
  });

  it("rejects release/refund after escrow is already closed", async () => {
    const ctx = await initializeContext();
    await initializeEscrow(ctx);
    await setCandidate(ctx);

    await program.methods
      .release()
      .accounts({
        employer: ctx.employer.publicKey,
        escrowState: ctx.escrowPda,
        vault: ctx.vaultPda,
        candidateTokenAccount: ctx.candidateTokenAccount,
        platformTokenAccount: ctx.platformTokenAccount,
        usdtMint: ctx.usdtMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([ctx.employer])
      .rpc();

    await expectAnchorError(
      program.methods
        .refund()
        .accounts({
          employer: ctx.employer.publicKey,
          escrowState: ctx.escrowPda,
          vault: ctx.vaultPda,
          employerTokenAccount: ctx.employerTokenAccount,
          platformTokenAccount: ctx.platformTokenAccount,
          usdtMint: ctx.usdtMint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([ctx.employer])
        .rpc(),
      "NotActive",
    );
  });

  it("rejects token accounts with the wrong mint", async () => {
    const ctx = await initializeContext();
    await initializeEscrow(ctx);
    await setCandidate(ctx);

    await expectAnchorError(
      program.methods
        .release()
        .accounts({
          employer: ctx.employer.publicKey,
          escrowState: ctx.escrowPda,
          vault: ctx.vaultPda,
          candidateTokenAccount: ctx.candidateTokenAccount,
          platformTokenAccount: ctx.wrongMintTokenAccount,
          usdtMint: ctx.usdtMint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([ctx.employer])
        .rpc(),
      "WrongMint",
    );
  });
});
