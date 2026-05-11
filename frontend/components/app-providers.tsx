"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { PrivyProvider } from "@privy-io/react-auth";
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import { Toaster } from "@/components/ui/toaster";
import { ApiError } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { AuthProvider } from "@/components/AuthProvider"; // Keep if still used

// Solana Wallet Adapter
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import "@solana/wallet-adapter-react-ui/styles.css";

// Initialize wallets once
const wallets = [new PhantomWalletAdapter()];
const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";

console.log("RPC URL:", RPC_URL);

// ─────────────────────────────────────────────────────────────
// 🔐 AuthSessionWatcher: Listen for global logout events
// ─────────────────────────────────────────────────────────────
function AuthSessionWatcher() {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;

  useEffect(() => {
    function handleLogout() {
      routerRef.current.push("/auth");
    }
    window.addEventListener("auth:logout", handleLogout);
    return () => window.removeEventListener("auth:logout", handleLogout);
  }, []);

  return null;
}

// ─────────────────────────────────────────────────────────────
// 🔄 QueryClient Factory with global error handling
// ─────────────────────────────────────────────────────────────
function makeQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError(error) {
        // Global 401 handler: logout + redirect via DOM event
        if (error instanceof ApiError && error.status === 401) {
          useAuthStore.getState().logout(); // dispatches auth:logout
        }
      },
    }),
    defaultOptions: {
      queries: {
        // Don't retry 401s — let global handler take over
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status === 401) return false;
          return failureCount < 2;
        },
        staleTime: 60 * 1000, // 1 minute
        refetchOnWindowFocus: false, // optional: reduce noise
      },
    },
  });
}

// Singleton pattern for browser, new instance per request on server
let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === "undefined") {
    return makeQueryClient(); // Server: new instance
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient(); // Browser: singleton
  }
  return browserQueryClient;
}

// ─────────────────────────────────────────────────────────────
// 🧩 Main AppProviders Component
// ─────────────────────────────────────────────────────────────
export function AppProviders({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  // Wrap with Privy only if appId is configured
  const withPrivy = privyAppId ? (
    <PrivyProvider
      appId={privyAppId}
      config={{
        loginMethods: ["email", "wallet"],
        // Add more config as needed:
        // appearance: { theme: 'light' },
        // embeddedWallets: { createOnLogin: 'users-without-wallets' },
      }}
    >
      {children}
    </PrivyProvider>
  ) : (
    children
  );

  return (
    <QueryClientProvider client={queryClient}>
      {/* Global auth session watcher */}
      <AuthSessionWatcher />

      {/* Privy Auth (conditional) */}
      {withPrivy}

      {/* Your custom auth context (if still needed alongside Privy) */}
      <AuthProvider>
        {/* Solana Wallet Stack */}
        <ConnectionProvider endpoint={RPC_URL}>
          <WalletProvider wallets={wallets} autoConnect>
            <WalletModalProvider>
              {children}
              {/* Toaster at the deepest level ensures it's inside all contexts */}
              <Toaster />
            </WalletModalProvider>
          </WalletProvider>
        </ConnectionProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}