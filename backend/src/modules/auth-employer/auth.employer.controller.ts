import {
  Controller,
  Post,
  Res,
  Req,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';

import {
  ApiTags,
  ApiOperation,
} from '@nestjs/swagger';

import { Request, Response } from 'express';

import { JwtService } from '@nestjs/jwt';

import { AuthEmployerService } from './auth.employer.service';

import { BaseController } from '../../shared/base.controller';

import { Public } from './decorators/public.decorator';

import { AuthGuard } from '@nestjs/passport/dist/auth.guard';

import { UseGuards } from '@nestjs/common';

import { verifyPrivyToken } from './verify-privy-token';
import {
  clearAuthCookies,
  getCookieToken,
  setAuthCookies,
} from '../../shared/auth/auth-cookie';

@ApiTags('Auth (Employer)')
@Controller('auth/employer')
export class AuthEmployerController extends BaseController {
  private readonly logger = new Logger(
    AuthEmployerController.name,
  );

  constructor(
    private readonly authService: AuthEmployerService,
    private readonly jwtService: JwtService,
  ) {
    super();
  }

  // LOGIN

  @Public()
  @Post('login')
  @ApiOperation({
    summary: 'Employer login',
  })
  async login(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const privyUser =
        await verifyPrivyToken(req);

      const result =
        await this.authService.login(
          privyUser,
        );

      setAuthCookies(res, {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        role: 'employer',
      });

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unknown error';

      this.logger.error(errorMessage);

      throw error;
    }
  }

  // LOGOUT

  @Post('logout')
  @UseGuards(AuthGuard('jwt-employer'))
  async logout(@Req() req: Request, @Res() res: Response) {
    await this.authService.logout(((req as any).user as any).id);
    clearAuthCookies(res);

    return res.json({
      success: true,
    });
  }

  // REFRESH

  @Public()
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const refreshToken = getCookieToken(req, 'refresh_token');

      if (!refreshToken) {
        throw new UnauthorizedException(
          'No refresh token',
        );
      }

      const payload =
        this.jwtService.verify(
          refreshToken,
          {
            secret: process.env.JWT_REFRESH_SECRET,
          },
        );

      const result =
        await this.authService.refresh(
          payload,
        );

      setAuthCookies(res, {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        role: 'employer',
      });

      return res.json({
        success: true,
        data: {
          role: 'employer',
        },
      });
    } catch {
      clearAuthCookies(res);

      return res.status(401).json({
        success: false,
      });
    }
  }
}
