use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::{get_associated_token_address, AssociatedToken, ID as ASSOCIATED_TOKEN_ID},
    token::{self, CloseAccount, Mint, Token, TokenAccount, Transfer},
};

declare_id!("4jmvrfqG2Mhx9Wc92NaJvXwzNp2d6xAHFfymz6N3x1Ar");

pub const USDT_MINT: Pubkey = pubkey!("29NaQXG4m9LYBgptcDrpm4fUCkehFiToSgDWjPbcC4GD");
pub const PLATFORM_WALLET: Pubkey = pubkey!("E3QW5XjxFax9Jx4Wvd9Pqwyrvr8ySB1Rp43bVCYvzvDj");
pub const FEE_BPS: u64 = 100;
pub const BPS_DENOMINATOR: u64 = 10_000;

#[program]
pub mod escrow {
    use super::*;

    pub fn create_escrow(ctx: Context<CreateEscrow>, escrow_id: u64, amount: u64) -> Result<()> {
        require!(amount > 0, EscrowError::ZeroAmount);
        require!(amount % 100 == 0, EscrowError::AmountNotDivisible);

        let escrow = &mut ctx.accounts.escrow;
        escrow.employer = ctx.accounts.employer.key();
        escrow.candidate = None;
        escrow.amount = amount;
        escrow.bump = ctx.bumps.escrow;
        escrow.vault_bump = Pubkey::find_program_address(
            &[
                escrow.key().as_ref(),
                ctx.accounts.token_program.key().as_ref(),
                USDT_MINT.as_ref(),
            ],
            &ASSOCIATED_TOKEN_ID,
        )
        .1;
        escrow.released = false;

        token::transfer(ctx.accounts.transfer_to_vault_ctx(), amount)?;

        let _ = escrow_id;
        Ok(())
    }

    pub fn set_candidate(
        ctx: Context<SetCandidate>,
        _escrow_id: u64,
        candidate: Pubkey,
    ) -> Result<()> {
        require_keys_neq!(candidate, Pubkey::default(), EscrowError::InvalidCandidate);

        let escrow = &mut ctx.accounts.escrow;
        require!(!escrow.released, EscrowError::EscrowResolved);
        require!(escrow.candidate.is_none(), EscrowError::CandidateAlreadySet);

        escrow.candidate = Some(candidate);
        Ok(())
    }

    pub fn release(ctx: Context<Release>, escrow_id: u64) -> Result<()> {
        let escrow = &ctx.accounts.escrow;
        let employer = escrow.employer;
        let amount = escrow.amount;
        let bump = escrow.bump;

        require!(!escrow.released, EscrowError::EscrowResolved);
        let candidate = escrow.candidate.ok_or(EscrowError::CandidateNotSet)?;
        require!(
            ctx.accounts.candidate_ata.owner == candidate,
            EscrowError::WrongTokenOwner
        );
        require!(
            ctx.accounts.candidate_ata.key()
                == get_associated_token_address(&candidate, &USDT_MINT),
            EscrowError::InvalidAta
        );
        require!(
            ctx.accounts.vault.amount == amount,
            EscrowError::InvalidVaultAmount
        );

        let fee = platform_fee(amount)?;
        let candidate_amount = amount.checked_sub(fee).ok_or(EscrowError::MathOverflow)?;

        let escrow_id_bytes = escrow_id.to_le_bytes();
        let signer_seeds: &[&[&[u8]]] = &[&[
            b"escrow",
            employer.as_ref(),
            escrow_id_bytes.as_ref(),
            &[bump],
        ]];

        token::transfer(
            ctx.accounts.pay_platform_ctx().with_signer(signer_seeds),
            fee,
        )?;
        token::transfer(
            ctx.accounts.pay_candidate_ctx().with_signer(signer_seeds),
            candidate_amount,
        )?;

        ctx.accounts.escrow.released = true;

        token::close_account(ctx.accounts.close_vault_ctx().with_signer(signer_seeds))?;
        Ok(())
    }

    pub fn refund(ctx: Context<Refund>, escrow_id: u64) -> Result<()> {
        let escrow = &ctx.accounts.escrow;
        let employer = escrow.employer;
        let amount = escrow.amount;
        let bump = escrow.bump;

        require!(!escrow.released, EscrowError::EscrowResolved);
        require!(
            ctx.accounts.vault.amount == amount,
            EscrowError::InvalidVaultAmount
        );

        let fee = platform_fee(amount)?;
        let employer_amount = amount.checked_sub(fee).ok_or(EscrowError::MathOverflow)?;

        let escrow_id_bytes = escrow_id.to_le_bytes();
        let signer_seeds: &[&[&[u8]]] = &[&[
            b"escrow",
            employer.as_ref(),
            escrow_id_bytes.as_ref(),
            &[bump],
        ]];

        token::transfer(
            ctx.accounts.pay_platform_ctx().with_signer(signer_seeds),
            fee,
        )?;
        token::transfer(
            ctx.accounts.pay_employer_ctx().with_signer(signer_seeds),
            employer_amount,
        )?;

        ctx.accounts.escrow.released = true;

        token::close_account(ctx.accounts.close_vault_ctx().with_signer(signer_seeds))?;
        Ok(())
    }
}

fn platform_fee(amount: u64) -> Result<u64> {
    amount
        .checked_mul(FEE_BPS)
        .ok_or(EscrowError::MathOverflow)?
        .checked_div(BPS_DENOMINATOR)
        .ok_or(EscrowError::MathOverflow.into())
}

#[derive(Accounts)]
#[instruction(escrow_id: u64)]
pub struct CreateEscrow<'info> {
    #[account(mut)]
    pub employer: Signer<'info>,
    #[account(
        init,
        payer = employer,
        space = 8 + Escrow::INIT_SPACE,
        seeds = [b"escrow", employer.key().as_ref(), escrow_id.to_le_bytes().as_ref()],
        bump
    )]
    pub escrow: Account<'info, Escrow>,
    #[account(address = USDT_MINT @ EscrowError::WrongMint)]
    pub usdt_mint: Account<'info, Mint>,
    #[account(
        init,
        payer = employer,
        associated_token::mint = usdt_mint,
        associated_token::authority = escrow,
        associated_token::token_program = token_program
    )]
    pub vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = employer_ata.mint == USDT_MINT @ EscrowError::WrongMint,
        constraint = employer_ata.owner == employer.key() @ EscrowError::WrongTokenOwner,
        constraint = employer_ata.key() == get_associated_token_address(&employer.key(), &USDT_MINT) @ EscrowError::InvalidAta
    )]
    pub employer_ata: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> CreateEscrow<'info> {
    fn transfer_to_vault_ctx(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.key(),
            Transfer {
                from: self.employer_ata.to_account_info(),
                to: self.vault.to_account_info(),
                authority: self.employer.to_account_info(),
            },
        )
    }
}

#[derive(Accounts)]
#[instruction(escrow_id: u64)]
pub struct SetCandidate<'info> {
    #[account(
        mut,
        has_one = employer @ EscrowError::Unauthorized,
        seeds = [b"escrow", employer.key().as_ref(), escrow_id.to_le_bytes().as_ref()],
        bump = escrow.bump
    )]
    pub escrow: Account<'info, Escrow>,
    #[account(mut)]
    pub employer: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(escrow_id: u64)]
pub struct Release<'info> {
    #[account(
        mut,
        has_one = employer @ EscrowError::Unauthorized,
        seeds = [b"escrow", employer.key().as_ref(), escrow_id.to_le_bytes().as_ref()],
        bump = escrow.bump
    )]
    pub escrow: Account<'info, Escrow>,
    #[account(mut)]
    pub employer: Signer<'info>,
    #[account(
        mut,
        associated_token::mint = usdt_mint,
        associated_token::authority = escrow,
        associated_token::token_program = token_program
    )]
    pub vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = platform_ata.mint == USDT_MINT @ EscrowError::WrongMint,
        constraint = platform_ata.owner == PLATFORM_WALLET @ EscrowError::WrongTokenOwner,
        constraint = platform_ata.key() == get_associated_token_address(&PLATFORM_WALLET, &USDT_MINT) @ EscrowError::InvalidAta
    )]
    pub platform_ata: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = candidate_ata.mint == USDT_MINT @ EscrowError::WrongMint
    )]
    pub candidate_ata: Account<'info, TokenAccount>,
    #[account(address = USDT_MINT @ EscrowError::WrongMint)]
    pub usdt_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}

impl<'info> Release<'info> {
    fn pay_platform_ctx(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        self.transfer_from_vault_to(&self.platform_ata)
    }

    fn pay_candidate_ctx(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        self.transfer_from_vault_to(&self.candidate_ata)
    }

    fn close_vault_ctx(&self) -> CpiContext<'_, '_, '_, 'info, CloseAccount<'info>> {
        CpiContext::new(
            self.token_program.key(),
            CloseAccount {
                account: self.vault.to_account_info(),
                destination: self.employer.to_account_info(),
                authority: self.escrow.to_account_info(),
            },
        )
    }

    fn transfer_from_vault_to(
        &self,
        to: &Account<'info, TokenAccount>,
    ) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.key(),
            Transfer {
                from: self.vault.to_account_info(),
                to: to.to_account_info(),
                authority: self.escrow.to_account_info(),
            },
        )
    }
}

#[derive(Accounts)]
#[instruction(escrow_id: u64)]
pub struct Refund<'info> {
    #[account(
        mut,
        has_one = employer @ EscrowError::Unauthorized,
        seeds = [b"escrow", employer.key().as_ref(), escrow_id.to_le_bytes().as_ref()],
        bump = escrow.bump
    )]
    pub escrow: Account<'info, Escrow>,
    #[account(mut)]
    pub employer: Signer<'info>,
    #[account(
        mut,
        associated_token::mint = usdt_mint,
        associated_token::authority = escrow,
        associated_token::token_program = token_program
    )]
    pub vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = platform_ata.mint == USDT_MINT @ EscrowError::WrongMint,
        constraint = platform_ata.owner == PLATFORM_WALLET @ EscrowError::WrongTokenOwner,
        constraint = platform_ata.key() == get_associated_token_address(&PLATFORM_WALLET, &USDT_MINT) @ EscrowError::InvalidAta
    )]
    pub platform_ata: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = employer_ata.mint == USDT_MINT @ EscrowError::WrongMint,
        constraint = employer_ata.owner == employer.key() @ EscrowError::WrongTokenOwner,
        constraint = employer_ata.key() == get_associated_token_address(&employer.key(), &USDT_MINT) @ EscrowError::InvalidAta
    )]
    pub employer_ata: Account<'info, TokenAccount>,
    #[account(address = USDT_MINT @ EscrowError::WrongMint)]
    pub usdt_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}

impl<'info> Refund<'info> {
    fn pay_platform_ctx(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        self.transfer_from_vault_to(&self.platform_ata)
    }

    fn pay_employer_ctx(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        self.transfer_from_vault_to(&self.employer_ata)
    }

    fn close_vault_ctx(&self) -> CpiContext<'_, '_, '_, 'info, CloseAccount<'info>> {
        CpiContext::new(
            self.token_program.key(),
            CloseAccount {
                account: self.vault.to_account_info(),
                destination: self.employer.to_account_info(),
                authority: self.escrow.to_account_info(),
            },
        )
    }

    fn transfer_from_vault_to(
        &self,
        to: &Account<'info, TokenAccount>,
    ) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.key(),
            Transfer {
                from: self.vault.to_account_info(),
                to: to.to_account_info(),
                authority: self.escrow.to_account_info(),
            },
        )
    }
}

#[account]
#[derive(InitSpace)]
pub struct Escrow {
    pub employer: Pubkey,
    pub candidate: Option<Pubkey>,
    pub amount: u64,
    pub bump: u8,
    pub vault_bump: u8,
    pub released: bool,
}

#[error_code]
pub enum EscrowError {
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Amount must be divisible by 100 so the 1% fee is exact")]
    AmountNotDivisible,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Only the employer can perform this action")]
    Unauthorized,
    #[msg("Candidate has already been set")]
    CandidateAlreadySet,
    #[msg("Candidate cannot be the default public key")]
    InvalidCandidate,
    #[msg("Candidate has not been set")]
    CandidateNotSet,
    #[msg("Escrow has already been released or refunded")]
    EscrowResolved,
    #[msg("Token account mint is not the hardcoded USDT mint")]
    WrongMint,
    #[msg("Token account owner is invalid")]
    WrongTokenOwner,
    #[msg("Expected an associated token account")]
    InvalidAta,
    #[msg("Vault balance does not match escrow amount")]
    InvalidVaultAmount,
}
