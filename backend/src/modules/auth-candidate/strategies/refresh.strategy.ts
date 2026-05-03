import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import Redis from 'ioredis';
import { Strategy, ExtractJwt } from 'passport-jwt';

@Injectable()
export class RefreshStrategy extends PassportStrategy(Strategy, 'refresh') {
constructor(
  @Inject('REDIS') private readonly redis: Redis,
) {
  super({
    jwtFromRequest: ExtractJwt.fromExtractors([
      (req) => req?.cookies?.refresh_token,
      (req) => req?.headers?.authorization?.replace('Bearer ', ''),
    ]),
    secretOrKey: process.env.JWT_REFRESH_SECRET,
    passReqToCallback: true,
  });
}

  async validate(req: any, payload: any) {
  const refreshToken = req?.cookies?.refresh_token;

  const storedJti = await this.redis.get(`refresh:${payload.sub}`);

  if (!storedJti) throw new UnauthorizedException();

  if (storedJti !== payload.jti) {
    throw new UnauthorizedException('Refresh token revoked');
  }

  return {
    userId: payload.sub,
    jti: payload.jti,
  };
}
// async validate(req: any, payload: any) {
//   console.log('--- REFRESH STRATEGY HIT ---');

//   console.log('COOKIES:', req?.cookies);
//   console.log('HEADERS COOKIE:', req?.headers?.cookie);
//   console.log('PAYLOAD:', payload);

//   const refreshToken = req?.cookies?.refresh_token;
//   console.log('EXTRACTED REFRESH TOKEN:', refreshToken);

//   const storedJti = await this.redis.get(`refresh:${payload.sub}`);
//   console.log('REDIS STORED JTI:', storedJti);
//   console.log('TOKEN JTI:', payload.jti);

//   if (!storedJti) {
//     console.log('❌ FAIL: no stored jti in redis');
//     throw new UnauthorizedException('Invalid or expired refresh token');
//   }

//   if (storedJti !== payload.jti) {
//     console.log('❌ FAIL: jti mismatch');
//     throw new UnauthorizedException('Invalid or expired refresh token');
//   }

//   console.log('✅ REFRESH VALID');

//   return {
//     userId: payload.sub,
//     jti: payload.jti,
//   };
// }
  // async validate(req: any, payload: any) {
  //   const refreshToken = req?.cookies?.refresh_token;

  //   return { id: payload.sub, refreshToken };
  // }
}
