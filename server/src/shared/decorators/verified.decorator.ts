import { applyDecorators, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { VerifiedGuard } from '../../modules/auth/guards/verified.guard';

export const VerifiedAuth = () =>
  applyDecorators(
    UseGuards(AuthGuard('jwt'), VerifiedGuard),
  );