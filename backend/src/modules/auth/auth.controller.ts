import { Controller, Get, Post, Req, Res, Body, UseGuards, Query } from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { LoginDto } from './schemas/login.schema';
import { RegisterDto } from './schemas/register.schema';
import { OnboardingDto } from './schemas/onboarding.schema';
import { ActivateMfaDto, VerifyMfaDto, VerifyMfaRecoveryDto } from './schemas/mfa.schema';
import { RequestPasswordResetDto, ResetPasswordDto } from './schemas/password-reset.schema';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { GithubLinkGuard } from './guards/github.link.guard';
import { GoogleLinkGuard } from './guards/google.link.guard';
import { VerifiedAuth } from '../../shared/decorators/verified.decorator';
import { VerifyEmailDto, OAuthCallbackQueryDto } from './schemas/auth-contract.dto';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
  ApiHeader,
} from '@nestjs/swagger';
import { OnboardingGuard } from './guards/onboarding.guard';
import { VerifiedGuard } from './guards/verified.guard';

@ApiTags('Auth')
@Throttle({ default: { limit: 500, ttl: 60000 } })
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private config: ConfigService
  ) {}

  // ---------------- LOGIN ----------------


  @Post('register')
  @ApiOperation({
    summary: 'Create new user account',
    description:
      'Registers a new user and initializes authentication credentials. Returns auth tokens on success.',
  })
  @ApiBody({ type: RegisterDto })
  async register(@Body() dto: RegisterDto, @Res() res: Response) {
    const result = await this.authService.register(dto);
    console.log("Register result: ", result); // Debug log to check the registration result
    if ('accessToken' in result && 'refreshToken' in result) {
      res.cookie('access_token', result.accessToken, { httpOnly: true });
      res.cookie('refresh_token', result.refreshToken, { httpOnly: true });
      return res.status(200).json({ success: true });
    }
    if ('needsVerification' in result && 'email' in result ) {
    return res.redirect(`http://localhost:3001/verify?email=${result.email}`);
  }
    return res.status(401).json({ message: 'Invalid registration' });
  }


  @Post('verify-email')
  @ApiOperation({
    summary: 'Verify email address',
    description:
      'Verifies user email using a one-time verification code sent via email.',
  })
  @ApiBody({ type: VerifyEmailDto })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.code);
  }


  @Post('login')
  @ApiOperation({
    summary: 'Authenticate user',
    description:
      'Validates email/password credentials and returns access + refresh tokens if valid.',
  })
  @ApiBody({ type: LoginDto })
  async login(@Body() dto: LoginDto, @Res() res: Response) {
    const result = await this.authService.login(dto);
    if ('accessToken' in result && 'refreshToken' in result) {
      res.cookie('access_token', result.accessToken, { httpOnly: true });
      res.cookie('refresh_token', result.refreshToken, { httpOnly: true });
      return res.status(200).json({ success: true });
    }
    return res.status(401).json({ message: 'Invalid login credentials' });
  }

@VerifiedAuth()
@Post('logout')
@ApiBearerAuth()
@ApiOperation({
  summary: 'Logout user',
  description:
    'Invalidates current session or refresh token for authenticated user.',
})
async logout(@Req() req: any, @Res() res: Response) {
  await this.authService.logout(req.user);

  res.clearCookie('access_token');
  res.clearCookie('refresh_token');

  return res.json({ success: true });
}

  // ---------------- OAUTH LOGIN ----------------

  @UseGuards(AuthGuard('github'))
  @Get('github')
  @ApiOperation({
    summary: 'Start GitHub OAuth login',
    description:
      'Redirects user to GitHub OAuth flow. No request body required.',
  })
  githubLogin() {}

@UseGuards(AuthGuard('github'))
@Get('github/callback')
@SkipThrottle()
@ApiOperation({
  summary: 'GitHub OAuth callback',
  description:
    'Handles GitHub OAuth callback and logs user in or registers them if first-time.',
})
async githubCallback(@Req() req: any, @Res() res: Response) {
  const result = await this.authService.oauthLogin(req.user, 'GITHUB');

  if ('needsOnboarding' in result && 'tempToken' in result) {
    res.cookie('temp_auth', result.tempToken, { httpOnly: true });
    return res.redirect('http://localhost:3001/onboarding');
  }

  if ('accessToken' in result && 'refreshToken' in result) {
    res.cookie('access_token', result.accessToken, { httpOnly: true });
    res.cookie('refresh_token', result.refreshToken, { httpOnly: true });
    return res.redirect('http://localhost:3001/dashboard');
  }

  if ('mfaRequired' in result && 'mfaToken' in result) {
    return res.redirect(`http://localhost:3001/mfa?token=${result.mfaToken}`);
  }

  if ('needsVerification' in result && 'email' in result) {
    return res.redirect(`http://localhost:3001/verify?email=${result.email}`);
  }
  return res.status(401).json({ message: 'Invalid Github credentials' });
}

  @UseGuards(AuthGuard('google'))
  @Get('google')
  @ApiOperation({
    summary: 'Start Google OAuth login',
    description:
      'Redirects user to Google OAuth flow. No request body required.',
  })
  googleLogin() {}


 @UseGuards(AuthGuard('google'))
  @Get('google/callback')
  @SkipThrottle()
  @ApiOperation({
    summary: 'Google OAuth callback',
    description:
      'Handles Google OAuth callback and logs user in or registers them if first-time.',
  })
async googleCallback(@Req() req: any, @Res() res: Response) {
  const result = await this.authService.oauthLogin(req.user, 'GOOGLE');

  if ('needsOnboarding' in result && 'tempToken' in result) {
    res.cookie('temp_auth', result.tempToken, { httpOnly: true });
    return res.redirect('http://localhost:3001/onboarding');
  }

  if ('accessToken' in result && 'refreshToken' in result) {
    res.cookie('access_token', result.accessToken, { httpOnly: true });
    res.cookie('refresh_token', result.refreshToken, { httpOnly: true });
    return res.redirect('http://localhost:3001/dashboard');
  }

  if ('mfaRequired' in result && 'mfaToken' in result) {
    return res.redirect(`http://localhost:3001/mfa?token=${result.mfaToken}`);
  }

  if ('needsVerification' in result && 'email' in result) {
    return res.redirect(`http://localhost:3001/verify?email=${result.email}`);
  }
  
  return res.status(401).json({ message: 'Invalid Google credentials' });

}


  // ---------------- ONBOARDING ----------------
  @UseGuards(OnboardingGuard)
@Post('onboarding')
@ApiBearerAuth()
 @ApiOperation({
    summary: 'Complete onboarding',
    description:
      'Completes onboarding flow using onboarding token provided in Authorization header. Requires Authorizing button and inputing the token',
  })
@ApiBody({ type: OnboardingDto })
async completeOnboarding(@Body() dto: OnboardingDto, @Req() req: any, @Res() res: Response) {
  const result = await this.authService.completeOnboarding(dto, req.onboarding);
  if ('accessToken' in result && 'refreshToken' in result) {
      res.cookie('access_token', result.accessToken, { httpOnly: true });
      res.cookie('refresh_token', result.refreshToken, { httpOnly: true });
      return res.status(200).json({ success: true });
    }
    return res.status(401).json({ message: 'Invalid onboarding token' });
}

  // ---------------- ACCOUNT LINKING ----------------

@Get('github/link')
@VerifiedAuth()
@ApiBearerAuth()
@ApiOperation({
    summary: 'Link GitHub account',
    description:
      'Initiates OAuth flow to connect GitHub account to authenticated user profile.',
  })
async linkGithub(@Req() req, @Res() res) {
  const url = await this.authService.githubLink(req.user.id);
  return res.redirect(url);
}

  @UseGuards(AuthGuard('jwt'), GithubLinkGuard)
  @Get('github/link/callback')
  @SkipThrottle()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'GitHub linking callback',
    description:
      'Final step of GitHub account linking after OAuth authorization.',
  })
  @ApiQuery({
    name: 'state',
    required: true,
    description: 'OAuth state parameter for CSRF protection',
  })
  async linkGithubCallback(@Req() req: any, @Query() query: OAuthCallbackQueryDto) {
    console.log("GitHub Link Callback - req.authUser:", req.authUser);
    console.log("GitHub Link Callback - req.user (GitHub profile):", req.user);
    return this.authService.linkOAuth(req.authUser.id, req.user, 'GITHUB', query.state);
  }


  @VerifiedAuth()
  @Get('google/link')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Link Google account',
    description:
      'Initiates OAuth flow to connect Google account to authenticated user profile.',
  })
async linkGoogle(@Req() req, @Res() res) {
  const url = await this.authService.googleLink(req.user.id);
  return res.redirect(url);
}

    @UseGuards(AuthGuard('jwt'), GoogleLinkGuard)
  @Get('google/link/callback')
  @SkipThrottle()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Google linking callback',
    description:
      'Final step of Google account linking after OAuth authorization.',
  })
  @ApiQuery({
    name: 'state',
    required: true,
    description: 'OAuth state parameter for CSRF protection',
  })
    async linkGoogleCallback(@Req() req: any, @Query() query: OAuthCallbackQueryDto) {
    console.log("Google Link Callback FUNCTION!!11 ");
      return this.authService.linkOAuth(req.authUser.id, req.user, 'GOOGLE', query.state);
  }

  // ---------------- REFRESH ----------------
  @UseGuards(AuthGuard('refresh'))
  @Post('refresh')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Uses a valid refresh token to issue a new access token. Requires refresh-token auth strategy.',
  })
  async refresh(@Req() req: any, @Res() res: Response) {
    const result = await this.authService.refresh(req.user);
    if ('accessToken' in result && 'refreshToken' in result) {
      res.cookie('access_token', result.accessToken, { httpOnly: true });
      res.cookie('refresh_token', result.refreshToken, { httpOnly: true });
      return res.status(200).json({ success: true });
    }
    return res.status(401).json({ message: 'Invalid refresh token' });
  }

  // ---------------- PASSWORD RESET ----------------

  @Throttle({ default: { limit: 3, ttl: 3600000 } })
  @Post('password-reset/request')
  @ApiOperation({
    summary: 'Request password reset email',
    description:
      'Sends a password reset email if the user exists. Always returns success to prevent user enumeration.',
  })
  @ApiBody({ type: RequestPasswordResetDto })
  requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(dto);
  }

  @Post('password-reset/reset')
  @ApiOperation({
    summary: 'Reset password',
    description:
      'Resets user password using a valid reset token received via email.',
  })
  @ApiBody({ type: ResetPasswordDto })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
  // ---------------- MFA ----------------

  @VerifiedAuth()
  @Get('mfa/setup')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Setup MFA',
    description:
      'Generates MFA secret and QR code for authenticator app setup.',
  })
  setupMfa(@Req() req: any) {
    return this.authService.setupMfa(req.user.id);
  }

  @VerifiedAuth()
  @Post('mfa/activate')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Activate MFA',
    description:
      'Activates MFA after verifying the initial OTP code from authenticator app.',
  })
  @ApiBody({ type: ActivateMfaDto })
  activateMfa(@Req() req: any, @Body() dto: ActivateMfaDto) {
    return this.authService.activateMfa(req.user.id, dto.code);
  }

  @Post('mfa/verify')
  @ApiOperation({
    summary: 'Verify MFA login',
    description:
      'Verifies MFA OTP during login flow and issues authentication tokens.',
  })
  @ApiBody({ type: VerifyMfaDto })
  async verifyMfa(@Body() dto: VerifyMfaDto, @Res() res: Response) {
    const result = await this.authService.verifyMfa(dto.userId, dto.code, dto.mfaToken);
    if ('accessToken' in result && 'refreshToken' in result) {
      res.cookie('access_token', result.accessToken, { httpOnly: true });
      res.cookie('refresh_token', result.refreshToken, { httpOnly: true });
      return res.status(200).json({ success: true });
    }
    return res.status(401).json({ message: 'Invalid MFA code' });
  }

  @Post('mfa/verify-recovery')
  @ApiOperation({
    summary: 'Verify MFA recovery code',
    description:
      'Allows login using backup recovery codes when MFA device is unavailable.',
  })
  @ApiBody({ type: VerifyMfaRecoveryDto })  
  async verifyMfaRecovery(@Body() dto: VerifyMfaRecoveryDto, @Res() res: Response) {
    const result = await this.authService.verifyMfaRecovery(
      dto.userId,
      dto.backupCode,
      dto.mfaToken,
    );
     if ('accessToken' in result && 'refreshToken' in result) {
      res.cookie('access_token', result.accessToken, { httpOnly: true });
      res.cookie('refresh_token', result.refreshToken, { httpOnly: true });
      return res.status(200).json({ success: true });
    }
    return res.status(401).json({ message: 'Invalid MFA code' });
  }
}
