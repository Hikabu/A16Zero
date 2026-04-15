import { z } from 'zod';

export const requestPasswordResetSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z
    .string()
    .min(8)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

export type RequestPasswordResetDto = z.infer<typeof requestPasswordResetSchema>;
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
