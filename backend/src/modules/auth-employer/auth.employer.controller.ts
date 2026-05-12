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

import {
  CookieOptions,
  Request,
  Response,
} from 'express';

import { JwtService } from '@nestjs/jwt';

import { AuthEmployerService } from './auth.employer.service';

import { BaseController } from '../../shared/base.controller';

import { Public } from './decorators/public.decorator';

import { AuthGuard } from '@nestjs/passport/dist/auth.guard';

import { UseGuards } from '@nestjs/common';

import { verifyPrivyToken } from './verify-privy-token';

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

  private readonly authCookieOptions: CookieOptions =
    {
      httpOnly: true,
      secure:
        process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    };

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

      res.cookie(
        'access_token',
        result.accessToken,
        {
          ...this.authCookieOptions,
          maxAge: 1000 * 60 * 15,
        },
      );

      res.cookie(
        'refresh_token',
        result.refreshToken,
        {
          ...this.authCookieOptions,
          maxAge:
            1000 * 60 * 60 * 24 * 7,
        },
      );

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
  async logout(@Res() res: Response) {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

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
      const refreshToken =
        req.cookies.refresh_token;

      if (!refreshToken) {
        throw new UnauthorizedException(
          'No refresh token',
        );
      }

      const payload =
        this.jwtService.verify(
          refreshToken,
        );

      const result =
        await this.authService.refresh(
          payload,
        );

      res.cookie(
        'access_token',
        result.accessToken,
        {
          ...this.authCookieOptions,
          maxAge: 1000 * 60 * 15,
        },
      );

      return res.json({
        success: true,
        data: result,
      });
    } catch {
      res.clearCookie('access_token');

      res.clearCookie('refresh_token');

      return res.status(401).json({
        success: false,
      });
    }
  }
}