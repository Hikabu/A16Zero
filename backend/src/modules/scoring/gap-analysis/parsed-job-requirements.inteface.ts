import { RoleType, Seniority } from '@prisma/client';

export interface ParsedJobRequirements {
  requiredTechnologies: string[];
  requiredRoleType: RoleType;
  requiredSeniority: Seniority;
  collaborationWeight: 'LOW' | 'MEDIUM' | 'HIGH';
  ownershipWeight: 'LOW' | 'MEDIUM' | 'HIGH';
  innovationWeight: 'LOW' | 'MEDIUM' | 'HIGH';
  isWeb3Role: boolean;
  parserConfidence: number; // 0–1
}
