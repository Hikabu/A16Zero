import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GithubSyncConnectStrategy extends PassportStrategy(
  Strategy,
  'githubSyncConnect',
) {
  constructor(private config: ConfigService) {
    // console.log(
    //   'Initializing GithubLinkStrategy with callback URL: ',
    //   config.get('app.url') + config.get('auth.githubCallback'),
    // );
    super({
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL:
        config.get('app.url') + config.get('auth.githubSyncConnectCallback'),
      scope: ['user:email'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any) {
    // console.log('RAW PROFILE:', JSON.stringify(profile, null, 2));
    // GitHub primary email is usually verified if it's the primary one,
    // but we check the profile emails array if available.
    const emailObj =
      profile.emails?.find((e: any) => e.primary) || profile.emails?.[0];

    return {
      githubId: profile.id,
      login: profile.username,
      email: emailObj?.value,
      email_verified: emailObj?.verified ?? true, // GitHub verified status
      accessToken,
    };
  }
}
