"use client";
import Link from "next/link";
import { Briefcase, Building2, User, ArrowLeft } from "lucide-react";

export default function SignupRolePage() {
  return (
    <div className="min-h-screen bg-[#0a0e1a] flex flex-col">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
            <Briefcase className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-semibold text-lg">HireOnChain</span>
        </Link>
        <Link href="/dashboard" className="text-sm text-white/50 hover:text-white transition-colors">
          Already have an account? Sign in
        </Link>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-4">
        <Link href="/" className="flex items-center gap-2 text-white/40 hover:text-white/70 text-sm mb-10 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <h1 className="text-3xl font-bold text-white mb-3 text-center">Create your account</h1>
        <p className="text-white/50 text-base mb-10 text-center">Choose how you&apos;ll use HireOnChain</p>

        <div className="flex gap-5">
          <Link
            href="/signup/employer"
            className="group flex flex-col gap-5 w-64 bg-white/5 hover:bg-violet-600/20 border border-white/10 hover:border-violet-500 rounded-2xl p-8 transition-all"
          >
            <div className="w-14 h-14 rounded-2xl bg-violet-600/20 group-hover:bg-violet-600/40 flex items-center justify-center transition-colors">
              <Building2 className="w-7 h-7 text-violet-400" />
            </div>
            <div>
              <p className="text-white font-semibold text-lg mb-2">Employer</p>
              <ul className="space-y-1.5">
                {["Post verified job listings", "Manage candidate pipeline", "Stake escrow bonds per role"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-white/50 text-xs">
                    <span className="w-1 h-1 rounded-full bg-violet-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <span className="text-sm font-medium text-violet-400 group-hover:text-violet-300 transition-colors mt-auto">
              Sign up as employer →
            </span>
          </Link>

          <Link
            href="/signup/candidate"
            className="group flex flex-col gap-5 w-64 bg-white/5 hover:bg-emerald-600/20 border border-white/10 hover:border-emerald-500 rounded-2xl p-8 transition-all"
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-600/20 group-hover:bg-emerald-600/40 flex items-center justify-center transition-colors">
              <User className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <p className="text-white font-semibold text-lg mb-2">Candidate</p>
              <ul className="space-y-1.5">
                {["Apply to bond-backed jobs only", "Get 48h response guarantee", "Verify identity once with KYC"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-white/50 text-xs">
                    <span className="w-1 h-1 rounded-full bg-emerald-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <span className="text-sm font-medium text-emerald-400 group-hover:text-emerald-300 transition-colors mt-auto">
              Sign up as candidate →
            </span>
          </Link>
        </div>
      </main>
    </div>
  );
}
