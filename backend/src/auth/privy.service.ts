import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jose from 'jose';
import { AppException } from '../common/app.exception';
import { Public } from './decorators/public.decorator';

@Injectable()
@Public()
export class PrivyService {
  private readonly logger = new Logger(PrivyService.name);
  //signing tokens
  private readonly jwks: ReturnType<typeof jose.createRemoteJWKSet>;

  constructor(private configService: ConfigService) {
    const appId = this.configService.get<string>('PRIVY_APP_ID');
    const jwksUrl = this.configService.get<string>(
      'PRIVY_JWKS_URL',
      `https://auth.privy.io/api/v1/apps/${appId}/jwks.json`,
    );

    this.jwks = jose.createRemoteJWKSet(new URL(jwksUrl));
  }

  async verifyToken(token: string) {
    console.log('TOKEN', token);
    console.log('NODE_ENV', process.env.NODE_ENV);
    if (process.env.NODE_ENV === 'development' && token === 'debugtoken') {
    return {
      privyId: 'did:privy:test-user-123',
      email: 'valeriia@test.com',
    };
  }
    try {
      const appId = this.configService.get<string>('PRIVY_APP_ID');
      
      const { payload } = await jose.jwtVerify(token, this.jwks, {
        issuer: 'privy.io',
        audience: appId,
      });

      return {
        privyId: payload.sub as string,
        email: (payload as any).email as string | undefined,
      };
    } catch (error) {
      this.logger.error(`Privy token verification failed: ${error.message}`);
      throw new AppException('Invalid or expired Privy token', 401);
    }
  }
}
