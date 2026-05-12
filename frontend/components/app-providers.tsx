"use client";

import { useMemo, useState, type ReactNode } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/components/AuthProvider";

// Solana
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import '@solana/wallet-adapter-react-ui/styles.css'
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";

import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (failureCount, error) => {
              const status = (error as { status?: number })?.status;
              if (status === 401 || status === 403) return false;
              return failureCount < 2;
            },
            refetchOnWindowFocus: false,
          },
        },
      }),
  );
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);
  const rpcEndpoint =
    process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com";

  const content = (
    <ConnectionProvider endpoint={rpcEndpoint}>
      <WalletProvider wallets={wallets} autoConnect localStorageKey="16signals-wallet">
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PrivyProvider
          appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
          config={{
            loginMethods: ["email", "wallet"],
            embeddedWallets: {
              solana: {
                createOnLogin: "users-without-wallets",
              },
            },
          }}
        >
          {content}
          <Toaster />
        </PrivyProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
