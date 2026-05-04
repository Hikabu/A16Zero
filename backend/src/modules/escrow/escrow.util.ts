import { createHash } from 'crypto';

export function jobUuidToEscrowId(uuid: string): bigint {
  return createHash('sha256').update(uuid).digest().readBigUint64LE(0);
}
