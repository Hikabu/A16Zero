#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PROGRAM_ID="4jmvrfqG2Mhx9Wc92NaJvXwzNp2d6xAHFfymz6N3x1Ar"
PROGRAM_SO="$ROOT_DIR/target/deploy/escrow.so"
LEDGER_DIR="$ROOT_DIR/.anchor/test-ledger"
LOG_FILE="$ROOT_DIR/.anchor/test-validator.log"
RPC_URL="http://127.0.0.1:8910"
WALLET="$ROOT_DIR/.anchor/test-wallet.json"
USDT_MINT="29NaQXG4m9LYBgptcDrpm4fUCkehFiToSgDWjPbcC4GD"
USDT_MINT_ACCOUNT="$ROOT_DIR/.anchor/test-usdt-mint.json"

rm -rf "$LEDGER_DIR"
node "$ROOT_DIR/scripts/create-test-mint-account.js"

solana-test-validator \
  --reset \
  --quiet \
  --ledger "$LEDGER_DIR" \
  --rpc-port 8910 \
  --faucet-port 9910 \
  --account "$USDT_MINT" "$USDT_MINT_ACCOUNT" \
  --bpf-program "$PROGRAM_ID" "$PROGRAM_SO" \
  > "$LOG_FILE" 2>&1 &

VALIDATOR_PID=$!

cleanup() {
  kill "$VALIDATOR_PID" >/dev/null 2>&1 || true
  wait "$VALIDATOR_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

for _ in {1..60}; do
  if solana cluster-version --url "$RPC_URL" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

solana cluster-version --url "$RPC_URL" >/dev/null

ANCHOR_PROVIDER_URL="$RPC_URL" \
ANCHOR_WALLET="$WALLET" \
yarn run ts-mocha -p ./tsconfig.json -t 1000000 'tests/**/*.ts'
