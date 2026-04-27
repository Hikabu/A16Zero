import { z } from 'zod';
import { RoleType, Seniority } from '@prisma/client';

export const ParsedJobRequirementsSchema = z.object({
  requiredTechnologies: z.array(z.string()),
  requiredRoleType: z.nativeEnum(RoleType),
  requiredSeniority: z.nativeEnum(Seniority),
  collaborationWeight: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  ownershipWeight: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  innovationWeight: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  isWeb3Role: z.boolean(),
  parserConfidence: z.number().min(0).max(1),
});

export type ParsedJobRequirementsDto = z.infer<typeof ParsedJobRequirementsSchema>;
