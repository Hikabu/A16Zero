import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
constructor(private config: ConfigService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: config.get('app.url') + config.get('auth.googleCallback'),
      scope: ['email', 'profile'],
      passReqToCallback: true
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
  ) {
    return {
      id: profile.id,
      email: profile.emails?.[0]?.value,
      email_verified: profile.emails?.[0]?.verified || profile._json?.email_verified,
      username: profile.displayName,
      firstName: profile.name?.givenName,
      lastName: profile.name?.familyName,
    };
  }
}