import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(private config: ConfigService) {
    super({
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: config.get('app.url') + config.get('auth.githubCallback'),
      scope: ['user:email'],
      passReqToCallback: true,
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any) {
    // GitHub primary email is usually verified if it's the primary one,
    // but we check the profile emails array if available.
    const emailObj =
      profile.emails?.find((e: any) => e.primary) || profile.emails?.[0];

    return {
      githubId: profile.id,
      username: profile.username,
      email: emailObj?.value,
      email_verified: emailObj?.verified ?? true, // GitHub verified status
      accessToken,
    };
  }
}
