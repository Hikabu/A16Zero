import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export const CreateAnalysisSchema = z
  .object({
    githubUsername: z.string().optional(),
    walletAddress: z
      .string()
      .regex(SOLANA_ADDRESS_REGEX, 'Invalid Solana wallet address format')
      .optional(),
  })
  .refine((data) => data.githubUsername || data.walletAddress, {
    message: 'At least one of githubUsername or walletAddress is required',
    path: ['githubUsername'], // Attach error to githubUsername if both missing
  });

export class CreateAnalysisDto extends createZodDto(CreateAnalysisSchema) {}

export const RecomputeAnalysisSchema = z
  .object({
    githubUsername: z.string().optional(),
    walletAddress: z.string().optional(),
    force: z.boolean().optional(),
  })
  .refine((data) => data.githubUsername || data.walletAddress, {
    message: 'At least one of githubUsername or walletAddress is required',
  });

export class RecomputeAnalysisDto extends createZodDto(
  RecomputeAnalysisSchema,
) {}
