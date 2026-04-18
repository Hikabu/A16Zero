import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jose from 'jose';
import { AppException } from '../common/app.exception';

@Injectable()
export class PrivyService {
  private readonly logger = new Logger(PrivyService.name);
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
