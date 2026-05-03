"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { login as apiLogin, isApiConfigured, getToken } from "../_lib/api/index";

export function TokenRehydrator() {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const attempted = useRef(false);
  const router = useRouter();

  useEffect(() => {
    if (!ready || !authenticated || getToken() || attempted.current) return;
    if (!isApiConfigured()) return;

    attempted.current = true;

    const embeddedWallet = wallets.find(
      (w) => w.walletClientType === "privy" || w.walletClientType === "privy-v2",
    );
    const walletAddress = embeddedWallet?.address ?? wallets[0]?.address;
    if (!walletAddress) return;

    getAccessToken()
      .then((token) => token && apiLogin(token, walletAddress))
      .catch(() => {
        // Privy session exists but exchange failed — redirect to login
        router.push("/login");
      });
  }, [ready, authenticated, wallets]);

  return null;
}
