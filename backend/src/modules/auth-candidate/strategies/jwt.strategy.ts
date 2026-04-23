import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    const secret = process.env.JWT_ACCESS_SECRET;

if (!secret) throw new Error('JWT_ACCESS_SECRET missing');

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
  (req) => req?.cookies?.access_token,
  ExtractJwt.fromAuthHeaderAsBearerToken(),
]),
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    return { 
      id: payload.sub, 
      isEmailVerified: payload.isEmailVerified,
      role: payload.role 
    };
  }
}