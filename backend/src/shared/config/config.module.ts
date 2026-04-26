import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  PRIVY_APP_ID: z.string(),
  PRIVY_SECRET: z.string(),
  ALCHEMY_API_KEY: z.string().optional(),
  RPC_URL: z
    .string()
    .url()
    .default('https://eth-sepolia.g.alchemy.com/v2/your-api-key'),
});

export type Env = z.infer<typeof envSchema>;

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => {
        const parsed = envSchema.safeParse(config);
        if (!parsed.success) {
          console.error(
            '❌ Invalid environment variables:',
            parsed.error.format(),
          );
          throw new Error('Invalid environment variables');
        }
        return parsed.data;
      },
    }),
  ],
})
export class ConfigModule {}
