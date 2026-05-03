import { RoleType, Seniority } from '@prisma/client';

export interface ParsedJobRequirements {
  requiredSkills: string[];
  requiredRoleType: RoleType;
  seniorityLevel: Seniority;
  collaborationWeight: 'LOW' | 'MEDIUM' | 'HIGH';
  ownershipWeight: 'LOW' | 'MEDIUM' | 'HIGH';
  innovationWeight: 'LOW' | 'MEDIUM' | 'HIGH';
  isWeb3Role: boolean;
  parserConfidence: number; // 0–1
}
