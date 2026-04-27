import { z } from 'zod';
import { RoleType, Seniority } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

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


export class ParsedJobRequirementsSwaggerDto {
  @ApiProperty({
    description: 'Technologies required for the role',
    example: ['Node.js', 'NestJS', 'PostgreSQL'],
  })
  requiredTechnologies: string[];

  @ApiProperty({
    enum: RoleType,
    example: RoleType.BACKEND,
    description: 'Primary role type expected for the candidate',
  })
  requiredRoleType: RoleType;

  @ApiProperty({
    enum: Seniority,
    example: Seniority.SENIOR,
    description: 'Expected seniority level',
  })
  requiredSeniority: Seniority;

  @ApiProperty({
    enum: ['LOW', 'MEDIUM', 'HIGH'],
    example: 'HIGH',
    description: 'Importance of collaboration skills',
  })
  collaborationWeight: 'LOW' | 'MEDIUM' | 'HIGH';

  @ApiProperty({
    enum: ['LOW', 'MEDIUM', 'HIGH'],
    example: 'MEDIUM',
    description: 'Importance of ownership/autonomy',
  })
  ownershipWeight: 'LOW' | 'MEDIUM' | 'HIGH';

  @ApiProperty({
    enum: ['LOW', 'MEDIUM', 'HIGH'],
    example: 'LOW',
    description: 'Importance of innovation and creativity',
  })
  innovationWeight: 'LOW' | 'MEDIUM' | 'HIGH';

  @ApiProperty({
    example: true,
    description: 'Whether this role is Web3-related',
  })
  isWeb3Role: boolean;

  @ApiProperty({
    example: 0.82,
    description:
      'Confidence score from the AI parser (0 to 1). Values below ~0.75 should be reviewed manually.',
    minimum: 0,
    maximum: 1,
  })
  parserConfidence: number;
}