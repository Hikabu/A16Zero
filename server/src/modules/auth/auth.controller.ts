import { Controller, Get, Post, Req, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { ZodValidationPipe } from '../../shared/pipes/zod.pipe';
import { loginSchema } from './schemas/login.schema';
import type { LoginDto } from './schemas/login.schema';
import { registerSchema } from './schemas/register.schema';
import type { RegisterDto } from './schemas/register.schema';
import { GithubLinkGuard } from './guards/github.link.guard';
import { GoogleLinkGuard } from './guards/google.link.guard';
import { ConfigService } from '@nestjs/config';
import type { OnboardingDto } from './schemas/onboarding.schema';
import { onboardingSchema } from './schemas/onboarding.schema';


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

  //jwt refresh
  @UseGuards(AuthGuard('refresh'))
  @Post('refresh')
  refresh(@Req() req: any) {
    return this.authService.refresh(req.user);
  }

  //logout 
  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  logout(@Req() req: any) {
    return this.authService.logout(req.user);
  }

  //----GITHUB----------

  //github login
  @UseGuards(AuthGuard('github'))
  @Get('github')
  githubLogin() {} //if this si nto called why is it here? shoudli tnot  be empty or no ft?

  //DO NOT USE - callback by github
  @UseGuards(AuthGuard('github'))
  @Get('github/callback')
  githubCallback(@Req() req: any) {
    return this.authService.oauthLogin(req.user, 'GITHUB');
  }

  // start linking
  @UseGuards(AuthGuard('jwt'))
  @Get('github/link')
  linkGithub(@Req() req: any) {
    const base = this.config.get('app.url');
    const path = this.config.get('auth.githubLinkCallback');
    return {
      url: `${base}${path}?state=${req.user.id}`,
    };
  }

  //DO NOT USE  
  @UseGuards(GithubLinkGuard)
  @Get('github/link/callback')
  linkGithubCallback(@Req() req: any) {
    return this.authService.linkOAuth({id: req.query.state}, req.user, 'GITHUB');
  }


  //----GOOGLE----------

  //google login
  @UseGuards(AuthGuard('google'))
  @Get('google')
  googleLogin() {}//if this si nto called why is it here? shoudli tnot  be empty or no ft?

  //DO NOT USE
  @UseGuards(AuthGuard('google'))
  @Get('google/callback')
  googleCallback(@Req() req: any) {
    return this.authService.oauthLogin(req.user, 'GOOGLE');
  }

  
  // start linking
  @UseGuards(AuthGuard('jwt'))
  @Get('google/link')
  linkGoogle(@Req() req: any) {
    const base = this.config.get('app.url');
    const path = this.config.get('auth.googleLinkCallback');

    return {
     url: `${base}${path}?state=${req.user.id}`,
    };
  }

  //DO NOT USE
  @UseGuards(GoogleLinkGuard)
  @Get('google/link/callback')
  linkGoogleCallback(@Req() req: any) {
    return this.authService.linkOAuth({id: req.query.state}, req.user, 'GOOGLE');
  }

  @Post('onboarding')
  completeOnboarding(
    @Body(new ZodValidationPipe(onboardingSchema)) dto: OnboardingDto,
    @Req() req: any
  ) {
    return this.authService.completeOnboarding(dto, req.headers.authorization);
  }

}