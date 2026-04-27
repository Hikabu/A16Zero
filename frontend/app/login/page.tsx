"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Briefcase, Loader2, ArrowLeft, LogIn } from "lucide-react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { login as apiLogin, isApiConfigured } from "../_lib/api/index";

const IS_PRIVY_CONFIGURED =
  !!process.env.NEXT_PUBLIC_PRIVY_APP_ID &&
  process.env.NEXT_PUBLIC_PRIVY_APP_ID !== "your-privy-app-id" &&
  process.env.NEXT_PUBLIC_PRIVY_APP_ID !== "placeholder";

const DEBUG_WALLET = "0x123456789abcdef0123456789abcdef012345678";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authRequested, setAuthRequested] = useState(false);

  const processingAuth = useRef(false);

  const { ready, authenticated, login: openPrivyModal, getAccessToken } = usePrivy();
  const { wallets } = useWallets();

  async function finalise(walletAddress: string) {
    try {
      const token = await getAccessToken();
      if (token && isApiConfigured()) {
        await apiLogin(token, walletAddress);
      }
      setLoading(false);
      setAuthError(null);
      router.push("/dashboard");
    } catch {
      setLoading(false);
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
      processingAuth.current
    )
      return;

    setLoading(true);
    setAuthError(null);
    setAuthRequested(true);
  }, [ready, authenticated, authRequested]);

  useEffect(() => {
    if (
      !IS_PRIVY_CONFIGURED ||
      !ready ||
      !authenticated ||
      !authRequested ||
      processingAuth.current
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
  }, [ready, authenticated, wallets, authRequested]);

  async function handleSignIn() {
    if (!IS_PRIVY_CONFIGURED) {
      setLoading(true);
      await new Promise((r) => setTimeout(r, 1000));
      if (isApiConfigured()) {
        await apiLogin("debugtoken", DEBUG_WALLET).catch(() => {});
      }
      router.push("/dashboard");
      return;
    }

    setLoading(true);
    setAuthError(null);
    setAuthRequested(true);

    if (ready && authenticated) return;

    try {
      await openPrivyModal();
    } catch {
      setLoading(false);
      setAuthRequested(false);
      setAuthError("Sign in failed. Please try again.");
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex flex-col">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
            <Briefcase className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-semibold text-lg">HireOnChain</span>
        </Link>
        <p className="text-white/40 text-sm">Employer sign in</p>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <Link
          href="/"
          className="flex items-center gap-2 text-white/40 hover:text-white/70 text-sm mb-8 transition-colors self-start max-w-md w-full mx-auto"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 max-w-md w-full">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-violet-600/20 mb-5">
            <Briefcase className="w-6 h-6 text-violet-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Welcome back</h2>
          <p className="text-white/50 text-sm mb-7">
            Sign in with your email or Google account.
          </p>

          {authError && (
            <p className="text-xs text-red-400 mb-4 text-center">{authError}</p>
          )}

          <button
            onClick={handleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold py-3.5 rounded-xl transition-colors disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            Sign In
          </button>
        </div>

        <p className="text-white/30 text-xs mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/signup/employer" className="text-violet-400 hover:text-violet-300 transition-colors">
            Sign up
          </Link>
        </p>
      </main>
    </div>
  );
}
