const fs = require("fs");
const path = require("path");
const { PublicKey, Keypair } = require("@solana/web3.js");
const {
  MINT_SIZE,
  MintLayout,
  TOKEN_PROGRAM_ID,
} = require("@solana/spl-token");

const root = path.resolve(__dirname, "..");
const walletPath = path.join(root, ".anchor", "test-wallet.json");
const outPath = path.join(root, ".anchor", "test-usdt-mint.json");

const USDT_MINT = new PublicKey("29NaQXG4m9LYBgptcDrpm4fUCkehFiToSgDWjPbcC4GD");
const walletSecret = Uint8Array.from(
  JSON.parse(fs.readFileSync(walletPath, "utf8"))
);
const mintAuthority = Keypair.fromSecretKey(walletSecret).publicKey;
const data = Buffer.alloc(MINT_SIZE);

MintLayout.encode(
  {
    mintAuthorityOption: 1,
    mintAuthority,
    supply: 0n,
    decimals: 6,
    isInitialized: true,
    freezeAuthorityOption: 0,
    freezeAuthority: PublicKey.default,
  },
  data
);

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(
  outPath,
  JSON.stringify({
    pubkey: USDT_MINT.toBase58(),
    account: {
      lamports: 1_000_000_000,
      data: [data.toString("base64"), "base64"],
      owner: TOKEN_PROGRAM_ID.toBase58(),
      executable: false,
      rentEpoch: 0,
    },
  })
);
