import { Controller, Get, Post, Req, Body, UseGuards, UnauthorizedException, Query, Redirect } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { ZodValidationPipe } from '../../shared/pipes/zod.pipe';
import { loginSchema } from './schemas/login.schema';
import type { LoginDto } from './schemas/login.schema';
import { registerSchema } from './schemas/register.schema';
import type { RegisterDto } from './schemas/register.schema';
import { ConfigService } from '@nestjs/config';
import type { OnboardingDto } from './schemas/onboarding.schema';
import { onboardingSchema } from './schemas/onboarding.schema';
import { activateMfaSchema, verifyMfaSchema, verifyMfaRecoverySchema } from './schemas/mfa.schema';
import type { ActivateMfaDto, VerifyMfaDto, VerifyMfaRecoveryDto } from './schemas/mfa.schema';
import { requestPasswordResetSchema, resetPasswordSchema } from './schemas/password-reset.schema';
import type { RequestPasswordResetDto, ResetPasswordDto } from './schemas/password-reset.schema';
import { Throttle } from '@nestjs/throttler';
import { SkipThrottle } from '@nestjs/throttler';
import { GithubLinkGuard } from './guards/github.link.guard';
import { GoogleLinkGuard } from './guards/google.link.guard';
import { VerifiedAuth } from '../../shared/decorators/verified.decorator';

@Throttle({ default: { limit: 5, ttl: 60000 } })
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private config: ConfigService
  ) {}

  @Post('login')
  login(
    @Body(new ZodValidationPipe(loginSchema)) dto: LoginDto
  ) {
    return this.authService.login(dto);
  }

  @Post('register')
  register(
  @Body(new ZodValidationPipe(registerSchema)) dto: RegisterDto
  ) {
    return this.authService.register(dto);
  }

  @UseGuards(AuthGuard('refresh'))
  @Post('refresh')
  refresh(@Req() req: any) {
      console.log("RAW HEADER:", req.headers.authorization);
  console.log("USER TOKEN:", req.user.refreshToken);
    return this.authService.refresh(req.user);
  }

  @Throttle({ default: { limit: 3, ttl: 3600000 } })
  @Post('password-reset/request')
  requestPasswordReset(@Body(new ZodValidationPipe(requestPasswordResetSchema)) dto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(dto);
  }

  @Post('password-reset/reset')
  resetPassword(@Body(new ZodValidationPipe(resetPasswordSchema)) dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @VerifiedAuth()
  @Post('logout')
  logout(@Req() req: any) {
    return this.authService.logout(req.user);
  }

  @Post('onboarding')
  completeOnboarding(
    @Body(new ZodValidationPipe(onboardingSchema)) dto: OnboardingDto,
    @Req() req: any
  ) {
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
  async linkGithubCallback(@Req() req: any, @Query('state') state: string) {
    return this.authService.linkOAuth(req.authUser.id, req.user, 'GITHUB', state);
  }

  @VerifiedAuth()
  @UseGuards(GoogleLinkGuard)  
  @Get('google/link/callback')
  @SkipThrottle()
  async linkGoogleCallback(@Req() req: any, @Query('state') state: string) {
    return this.authService.linkOAuth(req.authUser.id, req.user, 'GOOGLE', state);
  }

  // --- Email Verification ---

  @Post('verify-email')
  verifyEmail(@Body('code') code: string) {
    return this.authService.verifyEmail(code);
  }

  // --- MFA ---

  @VerifiedAuth()
  @Get('mfa/setup')
  setupMfa(@Req() req: any) {
    return this.authService.setupMfa(req.user.id);
  }

  @VerifiedAuth()
  @Post('mfa/activate')
  activateMfa(@Req() req: any, @Body(new ZodValidationPipe(activateMfaSchema)) dto: ActivateMfaDto) {
    return this.authService.activateMfa(req.user.id, dto.code);
  }

  @Post('mfa/verify')
  verifyMfa(@Body(new ZodValidationPipe(verifyMfaSchema)) dto: VerifyMfaDto) {
    return this.authService.verifyMfa(dto.userId, dto.code, dto.mfaToken);
  }

  @Post('mfa/verify-recovery')
  verifyMfaRecovery(@Body(new ZodValidationPipe(verifyMfaRecoverySchema)) dto: VerifyMfaRecoveryDto) {
    return this.authService.verifyMfaRecovery(dto.userId, dto.backupCode, dto.mfaToken);
  }
}