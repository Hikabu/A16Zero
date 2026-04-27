"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { LoadingCards } from "./PageState";
import { getToken, isApiConfigured, login as apiLogin } from "../_lib/api";

const IS_PRIVY_CONFIGURED =
  !!process.env.NEXT_PUBLIC_PRIVY_APP_ID &&
  process.env.NEXT_PUBLIC_PRIVY_APP_ID !== "your-privy-app-id" &&
  process.env.NEXT_PUBLIC_PRIVY_APP_ID !== "placeholder";

export function DashboardAuthGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const bypassAuth = !IS_PRIVY_CONFIGURED || !isApiConfigured();
  const router = useRouter();
  const { ready, authenticated, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const [allowed, setAllowed] = useState(() => bypassAuth || !!getToken());
  const processing = useRef(false);
  const canRender = allowed || bypassAuth || !!getToken();

  useEffect(() => {
    if (bypassAuth) return;

    if (!ready) return;

    if (!authenticated) {
      router.replace("/login");
      return;
    }

    if (getToken()) return;

    if (processing.current) return;

    const embeddedWallet = wallets.find(
      (w) => w.walletClientType === "privy" || w.walletClientType === "privy-v2",
    );
    const walletAddress = embeddedWallet?.address ?? wallets[0]?.address;
    if (!walletAddress) return;

    processing.current = true;

    getAccessToken()
      .then((token) => {
        if (!token) {
          throw new Error("MISSING_PRIVY_TOKEN");
        }
        return apiLogin(token, walletAddress);
      })
      .then(() => {
        setAllowed(true);
      })
      .catch(() => {
        router.replace("/login");
      })
      .finally(() => {
        processing.current = false;
      });
  }, [authenticated, bypassAuth, getAccessToken, ready, router, wallets]);

  if (!canRender) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-6xl p-8">
          <LoadingCards count={4} />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
