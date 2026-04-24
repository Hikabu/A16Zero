import { z } from 'zod';

export const envSchema = z.object({
  DATABASE_URL: z.string(),

  NODE_ENV: z.string(),
  PORT: z.coerce.number(),
  SERVER_URL: z.string(),
  FRONTEND_URL: z.string(),
  REDIS_URL: z.string(),

  GITHUB_APP_ID: z.coerce.number(),
  GITHUB_CLIENT_ID: z.string(),
  GITHUB_CLIENT_SECRET: z.string(),
  GITHUB_PRIVATE_KEY: z.string(),
  GITHUB_SYSTEM_TOKEN: z.string(),

  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),

  JWT_ACCESS_SECRET: z.string(),
  JWT_REFRESH_SECRET: z.string(),
  JWT_EXPIRY: z.string(),
  JWT_REFRESH_EXPIRY: z.string(),
  JWT_ISSUER: z.string(),
  JWT_AUDIENCE: z.string(),

  ENCRYPTION_KEY: z.string().optional(),
  INTERNAL_API_KEY: z.string().optional(),

  EVM_RPC_URL: z.string().optional(),
  SOLANA_RPC_URL: z.string().optional(),
  HELIUS_API_KEY: z.string().optional(),
  WALLET_CHALLENGE_SECRET: z.string().optional(),
  APP_BASE_URL: z.string().optional(),
  VOUCH_ICON_URL: z.string().optional(),

  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
});

export const env = envSchema.parse(process.env);
