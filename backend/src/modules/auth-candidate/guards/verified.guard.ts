import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../../../shared/decorators/verified.decorator';

@Injectable()
export class VerifiedGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // Use jwtUser (req.authUser) if it exists (from social link flow), else req.user
    const user = request.authUser || request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedException('Email verification required');
    }

    // Role check
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(`Access denied: required one of [${requiredRoles.join(', ')}]`);
    }

    return true;
  }
}