# Frontend Escrow Flow

All escrow ids and token amounts are returned as strings because they are `u64`/bigint values.

## 1. Get init params

Call:

```http
GET /escrow/init-params/:jobPostId
Authorization: Bearer <employerJwt>
```

Example response:

```json
{
  "success": true,
  "data": {
    "escrowId": "1234567890123456789",
    "expectedAmount": "250000000",
    "escrowAddress": "7eJ8hYqH6q6Gdfrb2uP83L6eJrwGQXSjQ2E6H6n8ZCwK"
  }
}
```

Backend behavior:

1. Verifies the authenticated employer owns the job post.
2. Computes `escrowId = sha256(jobPostId).readBigUint64LE(0)`.
3. Derives the escrow PDA with seeds `[b"escrow", employerPubkey, escrowId.to_le_bytes()]`.
4. Converts the job bonus amount to USDT base units with 6 decimals.

## 2. Create escrow on Solana

Use the returned `escrowId`, `expectedAmount`, and `escrowAddress` to build the `create_escrow` transaction.

If the user rejects the wallet transaction, do not call the backend confirm endpoint. The database remains unchanged.

If the user retries later, call `GET /escrow/init-params/:jobPostId` again. The backend repeats the same deterministic calculation, so the same job UUID produces the same `escrowId` and PDA.

## 3. Confirm funded

After the Solana transaction is confirmed, call:

```http
POST /escrow/confirm-funded
Authorization: Bearer <employerJwt>
Content-Type: application/json
```

Body:

```json
{
  "jobPostId": "2e25f0e3-9fd1-4d8f-bd44-0c9c94810d4b",
  "escrowAddress": "7eJ8hYqH6q6Gdfrb2uP83L6eJrwGQXSjQ2E6H6n8ZCwK"
}
```

Backend behavior:

1. Recomputes `escrowId` from `jobPostId`; frontend-supplied escrow ids are ignored.
2. Re-derives the PDA and rejects the request if it does not equal `escrowAddress`.
3. Fetches the escrow account and vault on-chain.
4. Verifies the on-chain employer equals the authenticated employer wallet.
5. Verifies the vault amount equals the job bonus amount in USDT base units.
6. Stores `escrowId`, `escrowAddress`, and `FUNDED` in the database.

## 4. Other confirmation endpoints

```http
POST /escrow/set-candidate
POST /escrow/confirm-released
POST /escrow/confirm-refunded
GET  /escrow/status/:jobPostId
```

`confirm-released` and `confirm-refunded` verify `escrow.released === true` on-chain before updating database state.
