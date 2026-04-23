import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const activateMfaSchema = z.object({
  code: z.string().describe('6-digit MFA code').length(6, 'MFA code must be 6 digits'),
});

export const verifyMfaSchema = z.object({
  userId: z.string().describe('Internal User ID').uuid('Invalid user ID format'),
  code: z.string().describe('6-digit MFA code').length(6, 'MFA code must be 6 digits'),
  mfaToken: z.string().describe('Temporary MFA session token').min(1, 'MFA token is required'),
});

export const verifyMfaRecoverySchema = z.object({
  userId: z.string().describe('Internal User ID').uuid('Invalid user ID format'),
  backupCode: z.string().describe('8-character recovery code').length(8, 'Backup code must be 8 characters'),
  mfaToken: z.string().describe('Temporary MFA session token').min(1, 'MFA token is required'),
});

export class ActivateMfaDto extends createZodDto(activateMfaSchema) {}
export class VerifyMfaDto extends createZodDto(verifyMfaSchema) {}
export class VerifyMfaRecoveryDto extends createZodDto(verifyMfaRecoverySchema) {}
