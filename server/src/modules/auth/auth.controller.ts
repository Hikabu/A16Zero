import {
  Controller,
  Get,
  Post,
  Req,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { LoginDto } from './schemas/login.schema';
import { RegisterDto } from './schemas/register.schema';
import { OnboardingDto } from './schemas/onboarding.schema';
import {
  ActivateMfaDto,
  VerifyMfaDto,
  VerifyMfaRecoveryDto,
} from './schemas/mfa.schema';
import {
  RequestPasswordResetDto,
  ResetPasswordDto,
} from './schemas/password-reset.schema';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { GithubLinkGuard } from './guards/github.link.guard';
import { GoogleLinkGuard } from './guards/google.link.guard';
import { VerifiedAuth } from '../../shared/decorators/verified.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  VerifyEmailDto,
  OAuthCallbackQueryDto,
} from './schemas/auth-contract.dto';

@ApiTags('Auth')
@Throttle({ default: { limit: 5, ttl: 60000 } })
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private config: ConfigService,
  ) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @UseGuards(AuthGuard('refresh'))
  @Post('refresh')
  refresh(@Req() req: any) {
    return this.authService.refresh(req.user);
  }

  @Throttle({ default: { limit: 3, ttl: 3600000 } })
  @Post('password-reset/request')
  requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(dto);
  }

  @Post('password-reset/reset')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @VerifiedAuth()
  @Post('logout')
  logout(@Req() req: any) {
    return this.authService.logout(req.user);
  }

  @Post('onboarding')
  completeOnboarding(@Body() dto: OnboardingDto, @Req() req: any) {
    // The onboarding token is in the Authorization header.
    return this.authService.completeOnboarding(dto, req.headers.authorization);
  }

  // --- OAuth Login ---

  @UseGuards(AuthGuard('github'))
  @Post('github')
  githubLogin() {}

  @UseGuards(AuthGuard('google'))
  @Post('google')
  googleLogin() {}

  @UseGuards(AuthGuard('github'))
  @Get('github/callback')
  @SkipThrottle()
  githubCallback(@Req() req: any) {
    return this.authService.oauthLogin(req.user, 'GITHUB');
  }

  @UseGuards(AuthGuard('google'))
  @Get('google/callback')
  @SkipThrottle()
  googleCallback(@Req() req: any) {
    return this.authService.oauthLogin(req.user, 'GOOGLE');
  }

  // --- Secure Account Linking ---

  @VerifiedAuth()
  @Get('github/link')
  async linkGithub(@Req() req: any) {
    return this.authService.githubLink(req.user.id);
  }

  @VerifiedAuth()
  @Get('google/link')
  async linkGoogle(@Req() req: any) {
    return this.authService.googleLink(req.user.id);
  }

  @VerifiedAuth()
  @UseGuards(GithubLinkGuard)
  @Get('github/link/callback')
  @SkipThrottle()
  async linkGithubCallback(
    @Req() req: any,
    @Query() query: OAuthCallbackQueryDto,
  ) {
    return this.authService.linkOAuth(
      req.authUser.id,
      req.user,
      'GITHUB',
      query.state,
    );
  }

  @VerifiedAuth()
  @UseGuards(GoogleLinkGuard)
  @Get('google/link/callback')
  @SkipThrottle()
  async linkGoogleCallback(
    @Req() req: any,
    @Query() query: OAuthCallbackQueryDto,
  ) {
    return this.authService.linkOAuth(
      req.authUser.id,
      req.user,
      'GOOGLE',
      query.state,
    );
  }

  // --- Email Verification ---

  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.code);
  }

  // --- MFA ---

  @VerifiedAuth()
  @Get('mfa/setup')
  setupMfa(@Req() req: any) {
    return this.authService.setupMfa(req.user.id);
  }

  @VerifiedAuth()
  @Post('mfa/activate')
  activateMfa(@Req() req: any, @Body() dto: ActivateMfaDto) {
    return this.authService.activateMfa(req.user.id, dto.code);
  }

  @Post('mfa/verify')
  verifyMfa(@Body() dto: VerifyMfaDto) {
    return this.authService.verifyMfa(dto.userId, dto.code, dto.mfaToken);
  }

  @Post('mfa/verify-recovery')
  verifyMfaRecovery(@Body() dto: VerifyMfaRecoveryDto) {
    return this.authService.verifyMfaRecovery(
      dto.userId,
      dto.backupCode,
      dto.mfaToken,
    );
  }
}
