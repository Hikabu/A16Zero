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
import { Throttle } from '@nestjs/throttler';
import { SkipThrottle } from '@nestjs/throttler';


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
    return this.authService.refresh(req.user);
  }

  @UseGuards(AuthGuard('jwt'))
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
  @Get('github')
  githubLogin() {} 

  @UseGuards(AuthGuard('google'))
  @Get('google')
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

  @UseGuards(AuthGuard('jwt'))
  @Get('github/link')
  async linkGithub(@Req() req: any) {
    const state = await this.authService.generateLinkState(req.user.id);
    const base = this.config.get('github.authorizationURL') || 'https://github.com/login/oauth/authorize';
    const clientId = this.config.get('github.clientID');
    const redirectUri = `${this.config.get('app.url')}${this.config.get('auth.githubLinkCallback')}`;
    
    return {
      url: `${base}?client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&scope=user:email`,
    };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('google/link')
  async linkGoogle(@Req() req: any) {
    const state = await this.authService.generateLinkState(req.user.id);
    // Google linking would follow similar pattern
    return { state, message: 'Redirect to Google OAuth with this state' };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('github/link/callback')
  @SkipThrottle()
  async linkGithubCallback(@Req() req: any, @Query('state') state: string) {
    // Use the social profile from the request (attached by Passport)
    // and the userId from our session JWT.
    return this.authService.linkOAuth(req.user.id, req.user, 'GITHUB', state);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('google/link/callback')
  @SkipThrottle()
  async linkGoogleCallback(@Req() req: any, @Query('state') state: string) {
    return this.authService.linkOAuth(req.user.id, req.user, 'GOOGLE', state);
  }

  // --- Email Verification ---

  @Post('verify-email')
  verifyEmail(@Body('code') code: string) {
    return this.authService.verifyEmail(code);
  }

  // --- MFA ---

  @UseGuards(AuthGuard('jwt'))
  @Get('mfa/setup')
  setupMfa(@Req() req: any) {
    return this.authService.setupMfa(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
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