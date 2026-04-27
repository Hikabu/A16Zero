import { WalletData } from "../types";

export async function getWallet(): Promise<WalletData> {
  return {
    wallet_address: "—",
    balance: "0",
    transactions: [],
    bonds: [],
  };
}

export async function depositFunds(_amount: string): Promise<{ tx_hash: string }> {
  return { tx_hash: "" };
}
