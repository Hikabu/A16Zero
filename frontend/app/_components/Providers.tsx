"use client";
import { PrivyProvider } from "@privy-io/react-auth";

// PrivyProvider must always be rendered so hooks work anywhere in the tree.
// If the app ID is not configured the provider initialises in a non-ready
// state — pages detect this and fall back to the debug flow.
export function Providers({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "placeholder";

  return (
    <PrivyProvider
      appId={appId}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#7c3aed",
        },
        loginMethods: ["email", "google"],
        embeddedWallets: {
          ethereum: { createOnLogin: "users-without-wallets" },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
