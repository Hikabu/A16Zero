import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const requestPasswordResetSchema = z.object({
  email: z.string().describe('Account email address').email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().describe('Password reset token received via email'),
  newPassword: z
    .string()
    .min(8)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
    .describe('New secure password'),
});

export class RequestPasswordResetDto extends createZodDto(requestPasswordResetSchema) {}
export class ResetPasswordDto extends createZodDto(resetPasswordSchema) {}
