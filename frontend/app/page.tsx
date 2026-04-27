"use client";
import Link from "next/link";
import { Briefcase, Shield, Zap, Building2, User } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0e1a] flex flex-col">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
            <Briefcase className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-semibold text-lg">HireOnChain</span>
        </div>
        <div className="flex items-center gap-5">
          <Link href="/signup" className="text-sm text-white/70 hover:text-white transition-colors">
            Sign Up
          </Link>
          <Link
            href="/login"
            className="text-sm bg-white/10 hover:bg-white/15 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Sign In
          </Link>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/30 rounded-full px-4 py-1.5 text-violet-400 text-xs font-medium mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          Web3 Hiring Platform — MVP v1.0
        </div>

        <h1 className="text-5xl font-bold text-white leading-tight max-w-2xl mb-5">
          Hire with accountability.<br />
          <span className="text-violet-400">Backed by escrow.</span>
        </h1>

        <p className="text-white/50 text-lg max-w-lg mb-12">
          No ghost jobs. No wasted applications. Every role is backed by a USDC escrow bond.
        </p>

        {/* Role selection cards */}
        <div className="flex gap-4 mb-14">
          <Link
            href="/signup/employer"
            className="group flex flex-col items-center gap-4 w-56 bg-white/5 hover:bg-violet-600/20 border border-white/10 hover:border-violet-500/60 rounded-2xl p-7 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-violet-600/30 group-hover:bg-violet-600/50 flex items-center justify-center transition-colors">
              <Building2 className="w-6 h-6 text-violet-300" />
            </div>
            <div>
              <p className="text-white font-semibold text-base mb-1">I&apos;m Hiring</p>
              <p className="text-white/40 text-xs leading-relaxed">Post jobs, manage candidates, stake bonds</p>
            </div>
            <span className="text-xs font-medium text-violet-400 group-hover:text-violet-300 transition-colors">
              Create Employer Account →
            </span>
          </Link>

          <Link
            href="/signup/candidate"
            className="group flex flex-col items-center gap-4 w-56 bg-white/5 hover:bg-emerald-600/20 border border-white/10 hover:border-emerald-500/60 rounded-2xl p-7 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-600/30 group-hover:bg-emerald-600/50 flex items-center justify-center transition-colors">
              <User className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <p className="text-white font-semibold text-base mb-1">I&apos;m Looking</p>
              <p className="text-white/40 text-xs leading-relaxed">Find verified jobs, protect your time</p>
            </div>
            <span className="text-xs font-medium text-emerald-400 group-hover:text-emerald-300 transition-colors">
              Create Candidate Profile →
            </span>
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-8 max-w-2xl">
          {[
            { icon: Shield, title: "Escrow-backed bonds", desc: "Every job posting requires a USDC bond to protect candidates." },
            { icon: Zap, title: "Gasless transactions", desc: "Gas fees covered by our paymaster. You only need USDC for bonds." },
            { icon: Briefcase, title: "10-minute onboarding", desc: "Go from signup to a live job posting in under 10 minutes." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="text-left">
              <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-3">
                <Icon className="w-4 h-4 text-violet-400" />
              </div>
              <h3 className="text-white font-medium text-sm mb-1">{title}</h3>
              <p className="text-white/40 text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
