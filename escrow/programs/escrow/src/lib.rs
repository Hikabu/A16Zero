use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("4jmvrfqG2Mhx9Wc92NaJvXwzNp2d6xAHFfymz6N3x1Ar");

// ── Constants ────────────────────────────────────────────────────────────────
/// Hardcoded platform wallet — not changeable by anyone.
/// Replace with your actual platform pubkey before deploying.
const PLATFORM_WALLET: &str = "E3QW5XjxFax9Jx4Wvd9Pqwyrvr8ySB1Rp43bVCYvzvDj";

/// 1% platform fee on successful hire  (basis points: 100 / 10_000 = 1%)
const PLATFORM_FEE_BPS: u64 = 100;
/// 7% penalty charged to employer on refund (basis points: 700 / 10_000 = 7%)
const REFUND_PENALTY_BPS: u64 = 700;
const BPS_DIVISOR: u64 = 10_000;

// ── Program ──────────────────────────────────────────────────────────────────
#[program]
pub mod escrow {
    use super::*;

    /// Employer calls this once to create the escrow and deposit USDT.
    /// `amount` is in USDT smallest units (6 decimals → 1 USDT = 1_000_000).
    pub fn initialize(ctx: Context<Initialize>, amount: u64) -> Result<()> {
        require!(amount > 0, EscrowError::ZeroAmount);

        // Verify the platform wallet matches our hardcoded constant
        let expected: Pubkey = PLATFORM_WALLET.parse().unwrap();
        require_keys_eq!(
            ctx.accounts.platform_token_account.owner,
            expected,
            EscrowError::InvalidPlatformWallet
        );

        let escrow = &mut ctx.accounts.escrow_state;
        escrow.employer        = ctx.accounts.employer.key();
        escrow.candidate       = Pubkey::default(); // not set yet
        escrow.deposited_amount = amount;
        escrow.bump            = ctx.bumps.escrow_state;
        escrow.status          = EscrowStatus::Active;

        // Transfer USDT from employer → escrow vault
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.key(),
                Transfer {
                    from:      ctx.accounts.employer_token_account.to_account_info(),
                    to:        ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.employer.to_account_info(),
                },
            ),
            amount,
        )?;

        emit!(EscrowInitialized {
            employer: escrow.employer,
            amount,
        });

        Ok(())
    }

    /// Employer sets (or updates) the approved candidate wallet.
    /// Only callable by the employer while the escrow is Active.
    pub fn set_candidate(ctx: Context<SetCandidate>, candidate: Pubkey) -> Result<()> {
        require!(
            candidate != Pubkey::default(),
            EscrowError::InvalidCandidate
        );

        let escrow = &mut ctx.accounts.escrow_state;
        require!(escrow.status == EscrowStatus::Active, EscrowError::NotActive);

        escrow.candidate = candidate;

        emit!(CandidateSet {
            employer:  escrow.employer,
            candidate,
        });

        Ok(())
    }

    /// Employer releases funds to the candidate.
    /// • Platform receives 1% of deposited_amount
    /// • Candidate receives the remaining 99%
    /// Caller must pass the candidate's USDT token account.
    pub fn release(ctx: Context<Release>) -> Result<()> {
        let escrow = &ctx.accounts.escrow_state;

        require!(escrow.status == EscrowStatus::Active,  EscrowError::NotActive);
        require!(
            escrow.candidate != Pubkey::default(),
            EscrowError::CandidateNotSet
        );
        // Candidate token account must be owned by the stored candidate pubkey
        require_keys_eq!(
            ctx.accounts.candidate_token_account.owner,
            escrow.candidate,
            EscrowError::WrongCandidateAccount
        );

        let amount    = escrow.deposited_amount;
        let fee       = fee_of(amount, PLATFORM_FEE_BPS);      // 1%
        let candidate_gets = amount.checked_sub(fee)
            .ok_or(EscrowError::MathOverflow)?;

        let seeds: &[&[u8]] = &[
            b"escrow",
            escrow.employer.as_ref(),
            &[escrow.bump],
        ];
        let signer = &[seeds];

        // → Platform (1%)
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                Transfer {
                    from:      ctx.accounts.vault.to_account_info(),
                    to:        ctx.accounts.platform_token_account.to_account_info(),
                    authority: ctx.accounts.escrow_state.to_account_info(),
                },
                signer,
            ),
            fee,
        )?;

        // → Candidate (99%)
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                Transfer {
                    from:      ctx.accounts.vault.to_account_info(),
                    to:        ctx.accounts.candidate_token_account.to_account_info(),
                    authority: ctx.accounts.escrow_state.to_account_info(),
                },
                signer,
            ),
            candidate_gets,
        )?;

        // Mark closed — prevents re-entry / double release
        let escrow = &mut ctx.accounts.escrow_state;
        escrow.status = EscrowStatus::Released;

        emit!(FundsReleased {
            employer:       escrow.employer,
            candidate:      escrow.candidate,
            candidate_gets,
            platform_fee:   fee,
        });

        Ok(())
    }

    /// Employer cancels and gets a refund.
    /// • Platform receives 7% penalty
    /// • Employer receives 93%
    pub fn refund(ctx: Context<Refund>) -> Result<()> {
        let escrow = &ctx.accounts.escrow_state;
        require!(escrow.status == EscrowStatus::Active, EscrowError::NotActive);

        let amount  = escrow.deposited_amount;
        let penalty = fee_of(amount, REFUND_PENALTY_BPS);      // 7%
        let employer_gets = amount.checked_sub(penalty)
            .ok_or(EscrowError::MathOverflow)?;

        let seeds: &[&[u8]] = &[
            b"escrow",
            escrow.employer.as_ref(),
            &[escrow.bump],
        ];
        let signer = &[seeds];

        // → Platform (7% penalty)
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                Transfer {
                    from:      ctx.accounts.vault.to_account_info(),
                    to:        ctx.accounts.platform_token_account.to_account_info(),
                    authority: ctx.accounts.escrow_state.to_account_info(),
                },
                signer,
            ),
            penalty,
        )?;

        // → Employer (93%)
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                Transfer {
                    from:      ctx.accounts.vault.to_account_info(),
                    to:        ctx.accounts.employer_token_account.to_account_info(),
                    authority: ctx.accounts.escrow_state.to_account_info(),
                },
                signer,
            ),
            employer_gets,
        )?;

        let escrow = &mut ctx.accounts.escrow_state;
        escrow.status = EscrowStatus::Refunded;

        emit!(FundsRefunded {
            employer:      escrow.employer,
            employer_gets,
            penalty,
        });

        Ok(())
    }
}

// ── Fee helper (no floating point) ──────────────────────────────────────────
/// Returns floor(amount * bps / 10_000). Rounds down in favour of the user.
fn fee_of(amount: u64, bps: u64) -> u64 {
    // u128 prevents overflow for large USDT amounts
    ((amount as u128 * bps as u128) / BPS_DIVISOR as u128) as u64
}

// ── Accounts ─────────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub employer: Signer<'info>,

    /// PDA that stores all escrow metadata.
    /// Seeded by [b"escrow", employer.key] so each employer gets exactly one
    /// escrow at a time (deploy another program instance for multiple escrows).
    #[account(
        init,
        payer  = employer,
        space  = EscrowState::LEN,
        seeds  = [b"escrow", employer.key().as_ref()],
        bump,
    )]
    pub escrow_state: Account<'info, EscrowState>,

    /// SPL token vault — owned by the PDA, holds the USDT.
    #[account(
        init,
        payer  = employer,
        token::mint      = usdt_mint,
        token::authority = escrow_state,   // PDA controls the vault
        seeds  = [b"vault", employer.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, TokenAccount>,

    /// Employer's USDT token account (source of funds).
    #[account(
        mut,
        constraint = employer_token_account.owner == employer.key() @ EscrowError::WrongOwner,
        constraint = employer_token_account.mint   == usdt_mint.key() @ EscrowError::WrongMint,
    )]
    pub employer_token_account: Account<'info, TokenAccount>,

    /// Platform's USDT token account — validated against hardcoded pubkey.
    #[account(
        mut,
        constraint = platform_token_account.mint == usdt_mint.key() @ EscrowError::WrongMint,
    )]
    pub platform_token_account: Account<'info, TokenAccount>,

    /// The USDT mint on Solana mainnet:
    /// Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB
    pub usdt_mint: Account<'info, anchor_spl::token::Mint>,

    pub token_program:  Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent:           Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct SetCandidate<'info> {
    #[account(mut)]
    pub employer: Signer<'info>,

    #[account(
        mut,
        seeds  = [b"escrow", employer.key().as_ref()],
        bump   = escrow_state.bump,
        constraint = escrow_state.employer == employer.key() @ EscrowError::Unauthorized,
    )]
    pub escrow_state: Account<'info, EscrowState>,
}

#[derive(Accounts)]
pub struct Release<'info> {
    #[account(mut)]
    pub employer: Signer<'info>,

    #[account(
        mut,
        seeds  = [b"escrow", employer.key().as_ref()],
        bump   = escrow_state.bump,
        constraint = escrow_state.employer == employer.key() @ EscrowError::Unauthorized,
    )]
    pub escrow_state: Account<'info, EscrowState>,

    #[account(
        mut,
        seeds  = [b"vault", employer.key().as_ref()],
        bump,
        constraint = vault.mint == usdt_mint.key() @ EscrowError::WrongMint,
    )]
    pub vault: Account<'info, TokenAccount>,

    /// Candidate's USDT token account — must be owned by stored candidate key.
    #[account(
        mut,
        constraint = candidate_token_account.mint == usdt_mint.key() @ EscrowError::WrongMint,
    )]
    pub candidate_token_account: Account<'info, TokenAccount>,

    /// Platform's USDT token account.
    #[account(
        mut,
        constraint = platform_token_account.mint == usdt_mint.key() @ EscrowError::WrongMint,
    )]
    pub platform_token_account: Account<'info, TokenAccount>,

    pub usdt_mint:      Account<'info, anchor_spl::token::Mint>,
    pub token_program:  Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Refund<'info> {
    #[account(mut)]
    pub employer: Signer<'info>,

    #[account(
        mut,
        seeds  = [b"escrow", employer.key().as_ref()],
        bump   = escrow_state.bump,
        constraint = escrow_state.employer == employer.key() @ EscrowError::Unauthorized,
    )]
    pub escrow_state: Account<'info, EscrowState>,

    #[account(
        mut,
        seeds  = [b"vault", employer.key().as_ref()],
        bump,
        constraint = vault.mint == usdt_mint.key() @ EscrowError::WrongMint,
    )]
    pub vault: Account<'info, TokenAccount>,

    /// Employer's USDT token account (refund destination).
    #[account(
        mut,
        constraint = employer_token_account.owner == employer.key() @ EscrowError::WrongOwner,
        constraint = employer_token_account.mint   == usdt_mint.key() @ EscrowError::WrongMint,
    )]
    pub employer_token_account: Account<'info, TokenAccount>,

    /// Platform's USDT token account.
    #[account(
        mut,
        constraint = platform_token_account.mint == usdt_mint.key() @ EscrowError::WrongMint,
    )]
    pub platform_token_account: Account<'info, TokenAccount>,

    pub usdt_mint:      Account<'info, anchor_spl::token::Mint>,
    pub token_program:  Program<'info, Token>,
}

// ── State ────────────────────────────────────────────────────────────────────

#[account]
pub struct EscrowState {
    pub employer:         Pubkey,       // 32
    pub candidate:        Pubkey,       // 32
    pub deposited_amount: u64,          // 8
    pub bump:             u8,           // 1
    pub status:           EscrowStatus, // 1
}

impl EscrowState {
    // discriminator(8) + fields
    pub const LEN: usize = 8 + 32 + 32 + 8 + 1 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum EscrowStatus {
    Active,    // 0 — funds locked
    Released,  // 1 — paid to candidate
    Refunded,  // 2 — returned to employer (with penalty)
}

// ── Events ───────────────────────────────────────────────────────────────────

#[event]
pub struct EscrowInitialized {
    pub employer: Pubkey,
    pub amount:   u64,
}

#[event]
pub struct CandidateSet {
    pub employer:  Pubkey,
    pub candidate: Pubkey,
}

#[event]
pub struct FundsReleased {
    pub employer:       Pubkey,
    pub candidate:      Pubkey,
    pub candidate_gets: u64,
    pub platform_fee:   u64,
}

#[event]
pub struct FundsRefunded {
    pub employer:      Pubkey,
    pub employer_gets: u64,
    pub penalty:       u64,
}

// ── Errors ───────────────────────────────────────────────────────────────────

#[error_code]
pub enum EscrowError {
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Escrow is not in Active state")]
    NotActive,
    #[msg("Candidate wallet has not been set")]
    CandidateNotSet,
    #[msg("Invalid candidate address")]
    InvalidCandidate,
    #[msg("Candidate token account does not match stored candidate")]
    WrongCandidateAccount,
    #[msg("Platform wallet does not match the hardcoded address")]
    InvalidPlatformWallet,
    #[msg("Token account has wrong mint")]
    WrongMint,
    #[msg("Token account has wrong owner")]
    WrongOwner,
    #[msg("Caller is not the employer")]
    Unauthorized,
    #[msg("Arithmetic overflow")]
    MathOverflow,
}
