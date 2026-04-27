import type { NextConfig } from "next";
import path from "path";

const farcasterMiniAppSolanaWebpackShim = path.resolve(
  __dirname,
  "app/_lib/shims/farcaster-mini-app-solana.ts",
);
const farcasterMiniAppSolanaTurbopackShim =
  "@/app/_lib/shims/farcaster-mini-app-solana";

const nextConfig: NextConfig = {
  experimental: {
    turbopackFileSystemCacheForDev: false,
  },
  turbopack: {
    resolveAlias: {
      "@farcaster/mini-app-solana": farcasterMiniAppSolanaTurbopackShim,
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@farcaster/mini-app-solana": farcasterMiniAppSolanaWebpackShim,
    };

    return config;
  },
};

export default nextConfig;
