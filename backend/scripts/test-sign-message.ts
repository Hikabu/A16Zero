import nacl from 'tweetnacl';
import bs58 from 'bs58';
import crypto from 'crypto';

// derive 32-byte seed from any string input
function deriveSeed(input: string): Uint8Array {
  const hash = crypto.createHash('sha256').update(input).digest();
  return new Uint8Array(hash); // 32 bytes
}

function getKeypair(id: string) {
  const seed = deriveSeed(id);
  return nacl.sign.keyPair.fromSeed(seed);
}

function signMessage(message: string, keypair: nacl.SignKeyPair) {
  const signature = nacl.sign.detached(
    Buffer.from(message),
    keypair.secretKey,
  );

  return {
    walletAddress: bs58.encode(keypair.publicKey),
    signature: bs58.encode(signature),
  };
}

// CLI input
const id = process.argv[2];        // e.g. "1", "2", "alice"
const message = process.argv[3];   // message to sign

if (!id || !message) {
  console.error(
    'Usage: npx ts-node scripts/test-sign-message <id> "<message>"'
  );
  process.exit(1);
}

const keypair = getKeypair(id);

console.log('=== WALLET ===');
console.log({
  id,
  walletAddress: bs58.encode(keypair.publicKey),
  privateKey: bs58.encode(keypair.secretKey),
});

console.log('=== SIGNATURE ===');
console.log(signMessage(message, keypair));