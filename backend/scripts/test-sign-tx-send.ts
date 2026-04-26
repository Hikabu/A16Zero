// sign-and-send.ts
import {
  Connection,
  Transaction,
  Keypair,
} from '@solana/web3.js';
import bs58 from 'bs58';

const RPC_URL = 'https://api.devnet.solana.com';

async function main() {
  const [base64Tx, privateKey] = process.argv.slice(2);

  if (!base64Tx || !privateKey) {
    throw new Error('Usage: ts-node scripts/sign-and-send.ts <base64Tx> <privateKey>');
  }

  const connection = new Connection(RPC_URL, 'confirmed');

  const keypair = Keypair.fromSecretKey(bs58.decode(privateKey));
  console.log('Wallet:', keypair.publicKey.toBase58());

  const tx = Transaction.from(Buffer.from(base64Tx, 'base64'));

const latest = await connection.getLatestBlockhash();
tx.recentBlockhash = latest.blockhash;

tx.sign(keypair);

const sig = await connection.sendRawTransaction(tx.serialize());

  await connection.confirmTransaction(sig, 'confirmed');
  console.log('Confirmed!');
  console.log("sig: ", sig);
}

main().catch(console.error);