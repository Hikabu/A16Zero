import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const OAuthCallbackQuerySchema = z.object({
  state: z.string().describe('Security state parameter for OAuth verification'),
});

export const VerifyEmailSchema = z.object({
  code: z
    .string()
    .describe('6-digit verification code sent to the users email'),
});

export class OAuthCallbackQueryDto extends createZodDto(
  OAuthCallbackQuerySchema,
) {}
export class VerifyEmailDto extends createZodDto(VerifyEmailSchema) {}
