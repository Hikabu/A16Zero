import { applyDecorators, UseGuards, SetMetadata } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { VerifiedGuard } from '../../modules/auth/guards/verified.guard';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

export const VerifiedAuth = (...roles: UserRole[]) =>
  applyDecorators(
    SetMetadata(ROLES_KEY, roles),
    UseGuards(AuthGuard('jwt'), VerifiedGuard),
  );
