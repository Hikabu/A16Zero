import nacl from 'tweetnacl';
import bs58 from 'bs58';
import crypto from 'crypto';


//how to use:
// ts-node sign-vouch.ts 1 alice


// ─── CONFIG ────────────────────────────────────────────────
const DOMAIN = 'a16zero';
const ACTION = 'VOUCH';
const TTL_MS = 5 * 60 * 1000; // 5 minutes

// ─── KEY DERIVATION ────────────────────────────────────────
function deriveSeed(input: string | number): Uint8Array {
  const hash = crypto.createHash('sha256').update(String(input)).digest();
  return new Uint8Array(hash);
}

function getKeypair(id: string | number) {
  const seed = deriveSeed(id);
  return nacl.sign.keyPair.fromSeed(seed);
}

// ─── PAYLOAD BUILDER ───────────────────────────────────────
function buildPayload(candidate: string, message?: string) {
  const now = new Date();
  const expires = new Date(now.getTime() + TTL_MS);

  return {
    domain: DOMAIN,
    action: ACTION,
    candidate,
    message: message ?? '',
    nonce: crypto.randomUUID(),
    issuedAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  };
}

// ─── SERIALIZATION (MUST MATCH BACKEND) ─────────────────────
function serializePayload(payload: any): Uint8Array {
  const message = JSON.stringify(payload);
  return new TextEncoder().encode(message);
}

// ─── SIGNING ───────────────────────────────────────────────
function signPayload(payload: any, walletId: string | number) {
  const keypair = getKeypair(walletId);

  const encoded = serializePayload(payload);

  const signature = nacl.sign.detached(
    encoded,
    keypair.secretKey
  );

  return {
    walletId,
    walletAddress: bs58.encode(keypair.publicKey),
    signature: bs58.encode(signature),
    payload,
  };
}

// ─── CLI ───────────────────────────────────────────────────
// usage:
// ts-node sign-vouch.ts <walletId> <candidate> [message]

const walletId = process.argv[2];
const candidate = process.argv[3];
const message = process.argv[4];

if (!walletId || !candidate) {
  console.error('Usage: ts-node sign-vouch.ts <walletId> <candidate> [message]');
  process.exit(1);
}

// build + sign
const payload = buildPayload(candidate, message);
const result = signPayload(payload, walletId);

console.log(JSON.stringify(result, null, 2));