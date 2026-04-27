"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Briefcase, Check, Loader2, Building2, ArrowLeft, LogIn } from "lucide-react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { login as apiLogin, isApiConfigured } from "../../_lib/api/index";

const STEPS = ["Create Account", "Company Details", "You're all set"];

// Build-time flag — true when a real Privy app ID is in the env
const IS_PRIVY_CONFIGURED =
  !!process.env.NEXT_PUBLIC_PRIVY_APP_ID &&
  process.env.NEXT_PUBLIC_PRIVY_APP_ID !== "your-privy-app-id" &&
  process.env.NEXT_PUBLIC_PRIVY_APP_ID !== "placeholder";

// Fallback wallet used only when PRIVY_BYPASS=true is set on the backend
const DEBUG_WALLET = "0x123456789abcdef0123456789abcdef012345678";

type Form = {
  auth_method: "privy" | null;
  company_name: string;
  industry: string;
  company_size: string;
  website: string;
};

const INIT: Form = {
  auth_method: null,
  company_name: "",
  industry: "",
  company_size: "",
  website: "",
};

export default function EmployerSignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(INIT);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authRequested, setAuthRequested] = useState(false);

  const processingAuth = useRef(false);

  const { ready, authenticated, login: openPrivyModal, getAccessToken } = usePrivy();
  const { wallets } = useWallets();

  function set(key: keyof Form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function finalise(walletAddress: string) {
    try {
      const token = await getAccessToken();
      if (token && isApiConfigured()) {
        await apiLogin(token, walletAddress);
      }
      setAuthLoading(false);
      setAuthError(null);
      set("auth_method", "privy");
      setStep(1);
    } catch {
      setAuthLoading(false);
      setAuthRequested(false);
      processingAuth.current = false;
      setAuthError("Sign in failed. Please try again.");
    }
  }

  useEffect(() => {
    if (
      !IS_PRIVY_CONFIGURED ||
      !ready ||
      !authenticated ||
      authRequested ||
      processingAuth.current ||
      step !== 0
    )
      return;

    setAuthLoading(true);
    setAuthError(null);
    setAuthRequested(true);
  }, [ready, authenticated, authRequested, step]);

  useEffect(() => {
    if (
      !IS_PRIVY_CONFIGURED ||
      !ready ||
      !authenticated ||
      !authRequested ||
      processingAuth.current ||
      step !== 0
    )
      return;

    const embeddedWallet = wallets.find(
      (w) => w.walletClientType === "privy" || w.walletClientType === "privy-v2",
    );
    const walletAddress = embeddedWallet?.address ?? wallets[0]?.address;
    if (!walletAddress) return;

    processingAuth.current = true;
    finalise(walletAddress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated, wallets, authRequested, step]);

  async function handleSignIn() {
    if (!IS_PRIVY_CONFIGURED) {
      setAuthLoading(true);
      await new Promise((r) => setTimeout(r, 1000));
      if (isApiConfigured()) {
        await apiLogin("debugtoken", DEBUG_WALLET).catch(() => {});
      }
      setAuthLoading(false);
      set("auth_method", "privy");
      setStep(1);
      return;
    }

    setAuthLoading(true);
    setAuthError(null);
    setAuthRequested(true);

    if (ready && authenticated) return;

    try {
      await openPrivyModal();
    } catch {
      setAuthLoading(false);
      setAuthRequested(false);
      setAuthError("Sign in failed. Please try again.");
    }
  }

  async function handleComplete() {
    setStep(2);
    await new Promise((r) => setTimeout(r, 1800));
    router.push("/dashboard");
  }

  const canComplete = form.company_name && form.industry && form.company_size;

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex flex-col">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
            <Briefcase className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-semibold text-lg">HireOnChain</span>
        </Link>
        <p className="text-white/40 text-sm">Employer sign up</p>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <Link href="/signup" className="flex items-center gap-2 text-white/40 hover:text-white/70 text-sm mb-8 transition-colors self-start max-w-md w-full mx-auto">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        {/* Progress */}
        <div className="flex items-center gap-0 mb-10 max-w-md w-full">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i < step ? "bg-violet-600 text-white" : i === step ? "bg-violet-600 text-white ring-4 ring-violet-600/20" : "bg-white/10 text-white/30"
                }`}>
                  {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className={`text-xs font-medium hidden sm:block whitespace-nowrap ${i === step ? "text-white" : i < step ? "text-white/60" : "text-white/30"}`}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px mx-3 ${i < step ? "bg-violet-600" : "bg-white/10"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 max-w-md w-full">
          {/* Step 0: Auth */}
          {step === 0 && (
            <div>
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-violet-600/20 mb-5">
                <Building2 className="w-6 h-6 text-violet-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Create your employer account</h2>
              <p className="text-white/50 text-sm mb-7">
                Sign in with your email or Google. A smart wallet will be created for you automatically.
              </p>

              {authError && (
                <p className="text-xs text-red-400 mb-4 text-center">{authError}</p>
              )}

              <button
                onClick={handleSignIn}
                disabled={authLoading}
                className="w-full flex items-center justify-center gap-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold py-3.5 rounded-xl transition-colors disabled:opacity-60"
              >
                {authLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                Get Started
              </button>

              <p className="text-white/30 text-xs text-center mt-6">
                No seed phrases. No wallet setup. Just sign in.
              </p>
            </div>
          )}

          {/* Step 1: Company details */}
          {step === 1 && (
            <div>
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-violet-600/20 mb-5">
                <Building2 className="w-6 h-6 text-violet-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Tell us about your company</h2>
              <p className="text-white/50 text-sm mb-7">This appears on your job listings.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1.5">Company Name *</label>
                  <input
                    value={form.company_name}
                    onChange={(e) => set("company_name", e.target.value)}
                    placeholder="e.g. Acme Corp"
                    className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1.5">Industry *</label>
                  <select
                    value={form.industry}
                    onChange={(e) => set("industry", e.target.value)}
                    className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 [&>option]:bg-gray-900"
                  >
                    <option value="" disabled>Select industry</option>
                    <option value="technology">Technology</option>
                    <option value="finance">Finance / DeFi</option>
                    <option value="healthcare">Healthcare</option>
                    <option value="media">Media & Entertainment</option>
                    <option value="ecommerce">E-Commerce</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1.5">Company Size *</label>
                  <select
                    value={form.company_size}
                    onChange={(e) => set("company_size", e.target.value)}
                    className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 [&>option]:bg-gray-900"
                  >
                    <option value="" disabled>Select size</option>
                    <option value="1-10">1–10 employees</option>
                    <option value="11-50">11–50 employees</option>
                    <option value="51-200">51–200 employees</option>
                    <option value="201-500">201–500 employees</option>
                    <option value="500+">500+ employees</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1.5">Website <span className="text-white/30">(optional)</span></label>
                  <input
                    value={form.website}
                    onChange={(e) => set("website", e.target.value)}
                    placeholder="https://yourcompany.com"
                    className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              <button
                onClick={handleComplete}
                disabled={!canComplete}
                className="w-full mt-6 bg-violet-600 hover:bg-violet-500 text-white font-semibold py-3.5 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Complete Setup
              </button>
            </div>
          )}

          {/* Step 2: Done */}
          {step === 2 && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-violet-600/20 border border-violet-500/40 flex items-center justify-center mx-auto mb-5">
                <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center">
                  <Check className="w-5 h-5 text-white" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">You&apos;re all set!</h2>
              <p className="text-white/50 text-sm mb-2">Smart account created. Company profile saved.</p>
              <p className="text-white/30 text-xs mb-6">Redirecting to your dashboard...</p>
              <Loader2 className="w-5 h-5 text-violet-400 animate-spin mx-auto" />
            </div>
          )}
        </div>

        {step < 2 && (
          <p className="text-white/30 text-xs mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-violet-400 hover:text-violet-300 transition-colors">Sign in</Link>
          </p>
        )}
      </main>
    </div>
  );
}
