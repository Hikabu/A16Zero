import { z } from 'zod';

export const activateMfaSchema = z.object({
  code: z.string().length(6, 'MFA code must be 6 digits'),
});

export const verifyMfaSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  code: z.string().length(6, 'MFA code must be 6 digits'),
  mfaToken: z.string().min(1, 'MFA token is required'),
});

export const verifyMfaRecoverySchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  backupCode: z.string().length(8, 'Backup code must be 8 characters'),
  mfaToken: z.string().min(1, 'MFA token is required'),
});

export type ActivateMfaDto = z.infer<typeof activateMfaSchema>;
export type VerifyMfaDto = z.infer<typeof verifyMfaSchema>;
export type VerifyMfaRecoveryDto = z.infer<typeof verifyMfaRecoverySchema>;
