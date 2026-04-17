import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

// @Injectable()
// export class VerifiedGuard implements CanActivate {
//   constructor(private reflector: Reflector) {}

//   canActivate(context: ExecutionContext): boolean {
//     const request = context.switchToHttp().getRequest();
//     const user = request.user;

//     if (!user) {
//       throw new UnauthorizedException('Authentication required');
//     }

//     if (!user.isEmailVerified) {
//       throw new UnauthorizedException('Email verification required');
//     }

//     return true;
//   }
// }

@Injectable()
export class VerifiedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // 👇 support both normal + OAuth flow
    const user = request.authUser || request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedException('Email verification required');
    }

    return true;
  }
}