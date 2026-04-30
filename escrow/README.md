# Hiring Escrow — Solana / Anchor

A minimal USDT escrow for locking a salary bonus, with a hardcoded platform fee.

---

## Flow

```
Employer deposits USDT
        │
        ▼
  ┌─────────────┐
  │  ESCROW PDA │  ← funds locked here
  └─────────────┘
        │
  ┌─────┴──────────────────────────┐
  │ Employer calls set_candidate() │
  └─────┬──────────────────────────┘
        │
  ┌─────┴──────┐        ┌───────────────┐
  │  release() │──99%──▶│  Candidate    │
  └─────┬──────┘        └───────────────┘
        └────────1%────▶  Platform wallet
  
  OR

  ┌─────────┐           ┌───────────────┐
  │ refund()│──99%─────▶│  Employer     │
  └────┬────┘           └───────────────┘
       └──────1%───────▶  Platform wallet
```

---

## Fees

| Event      | Employer gets | Candidate gets | Platform gets |
|------------|:---:|:---:|:---:|
| `release`  | 0%  | 99% | 1%  |
| `refund`   | 99% | 0%  | 1%  |

---

## Setup & Deploy

### Prerequisites
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.18.0/install)"

# Install Anchor CLI
cargo install --git https://github.com/coral-xyz/anchor avm --locked
avm install 0.30.1
avm use 0.30.1

# Install Node deps
yarn install
```

### 1. Set your platform wallet
Edit `programs/escrow/src/lib.rs`:
```rust
const PLATFORM_WALLET: &str = "YOUR_PLATFORM_PUBKEY_HERE";
```

### 2. Generate a program keypair
```bash
anchor keys generate
# Copy the output pubkey into:
#   - declare_id!("...") in lib.rs
#   - Anchor.toml [programs.devnet] / [programs.mainnet]
```

### 3. Build
```bash
anchor build
```

### 4. Deploy to devnet (for testing)
```bash
solana config set --url devnet
solana airdrop 2          # fund your deployer wallet
anchor deploy --provider.cluster devnet
```

### 5. Deploy to mainnet
```bash
solana config set --url mainnet-beta
anchor deploy --provider.cluster mainnet
```

> ⚠️ USDT mint on mainnet: `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`  
> Pass this as `usdtMint` in all instruction calls.

### 6. Run tests (localnet)
```bash
anchor test
```

---

## Security notes
- Platform wallet is **hardcoded** at compile time — cannot be changed post-deploy.
- PDA seeds are `[b"escrow", employer_pubkey]` → one escrow per employer address.
- Status enum prevents double-release / double-refund.
- All fee math uses `u128` internally to prevent overflow on large amounts.
- Only the employer (signer) can call `set_candidate`, `release`, and `refund`.

---

## Mint tokens devnet 
| Step       | Command                                   | Description                                                   |
| ---------- | ----------------------------------------- | ------------------------------------------------------------- |
| 1. Airdrop | `solana airdrop 2`                        | You need SOL to pay for the token’s “rent”.                   |
| 2. Create  | `spl-token create-token`                  | This creates the Mint Address (the “type” of token).          |
| 3. Account | `spl-token create-account <MINT_ADDRESS>` | Creates a storage box in your wallet for that specific token. |
| 4. Mint    | `spl-token mint <MINT_ADDRESS> 100`       | Actually prints 100 units of the token into your account.     |
