"use client";
import { useState } from "react";
import { Wallet, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { getWallet } from "../../_lib/api/finance";
import { BondBadge } from "../../_components/BondBadge";
import { LoadingCards, ErrorState } from "../../_components/PageState";
import { useApi } from "../../_lib/useApi";
import { Transaction } from "../../_lib/types";

const TX_LABELS: Record<Transaction["type"], string> = {
  deposit: "Deposit",
  bond_locked: "Bond Locked",
  bond_released: "Bond Released",
};

export default function FinancePage() {
  const { state, reload } = useApi(getWallet);
  const [showAddFunds, setShowAddFunds] = useState(false);

  if (state.status === "loading") return <LoadingCards count={3} />;
  if (state.status === "error") return <ErrorState message={state.message} onRetry={reload} />;

  const wallet = state.data;
  const truncatedAddress = `${wallet.wallet_address.slice(0, 6)}...${wallet.wallet_address.slice(-4)}`;
  const totalStaked = wallet.bonds.filter((b) => b.bond_status === "staked").reduce((s, b) => s + Number(b.amount), 0);
  const totalReleased = wallet.bonds.filter((b) => b.bond_status === "released").reduce((s, b) => s + Number(b.amount), 0);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Finance & Escrow</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your wallet and bond positions</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#0f1117] rounded-xl p-6 text-white">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="w-4 h-4 text-violet-400" />
            <span className="text-xs text-white/50">Available Balance</span>
          </div>
          <p className="text-3xl font-bold mb-1">${Number(wallet.balance).toLocaleString()}</p>
          <p className="text-xs text-white/40">USDC</p>
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-[10px] text-white/30 mb-1">Billing Account ID</p>
            <p className="text-xs font-mono text-white/50">{truncatedAddress}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-sm text-gray-500 mb-1">Total Staked</p>
          <p className="text-2xl font-bold text-gray-900">${totalStaked.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">USDC locked in escrow</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-sm text-gray-500 mb-1">Total Released</p>
          <p className="text-2xl font-bold text-gray-900">${totalReleased.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">USDC returned from completed hires</p>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setShowAddFunds(true)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <ArrowDownLeft className="w-4 h-4" /> Add Funds
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Active Bonds</h2>
          {wallet.bonds.length === 0 ? (
            <p className="text-gray-400 text-sm">No bonds yet.</p>
          ) : (
            <div className="space-y-3">
              {wallet.bonds.map((b) => (
                <div key={b.job_id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{b.job_title}</p>
                    <p className="text-xs text-gray-400">Staked {formatDate(b.staked_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">${Number(b.amount).toLocaleString()} USDC</p>
                    <BondBadge status={b.bond_status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Transaction History</h2>
          <div className="space-y-3">
            {wallet.transactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tx.type === "deposit" ? "bg-green-50" : "bg-orange-50"}`}>
                  {tx.type === "deposit"
                    ? <ArrowDownLeft className="w-4 h-4 text-green-600" />
                    : <ArrowUpRight className="w-4 h-4 text-orange-600" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{TX_LABELS[tx.type]}</p>
                  <p className="text-xs text-gray-400">{formatDate(tx.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${tx.type === "deposit" ? "text-green-600" : "text-gray-900"}`}>
                    {tx.type === "deposit" ? "+" : "-"}${Number(tx.amount).toLocaleString()}
                  </p>
                  <p className={`text-xs capitalize ${tx.status === "confirmed" ? "text-green-600" : tx.status === "pending" ? "text-orange-500" : "text-red-500"}`}>
                    {tx.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showAddFunds && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-7 max-w-sm w-full mx-4 text-center">
            <div className="w-12 h-12 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-5 h-5 text-violet-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Add Funds</h3>
            <p className="text-gray-500 text-sm mb-5">Transfer USDC to your smart account using your connected wallet.</p>
            <input type="number" placeholder="Amount in USDC" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 text-center text-lg font-bold mb-5" />
            <div className="flex gap-3">
              <button onClick={() => setShowAddFunds(false)} className="flex-1 border border-gray-200 text-gray-700 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={() => setShowAddFunds(false)} className="flex-1 bg-violet-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-violet-500 transition-colors">Confirm Transfer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
