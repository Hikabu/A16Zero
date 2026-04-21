import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jose from 'jose';
import { AppException } from '../common/app.exception';
import { Public } from './decorators/public.decorator';
import { PrivyClient } from '@privy-io/node';
require('dotenv').config();

@Injectable()
@Public()

export class PrivyService {
  
  private readonly logger = new Logger(PrivyService.name);
  //signing tokens
  private readonly jwks: ReturnType<typeof jose.createRemoteJWKSet>;
  private readonly privyClient: PrivyClient;

  constructor(private configService: ConfigService) {
    const appId = this.configService.get<string>('PRIVY_APP_ID');
    const appSecret = this.configService.get<string>('PRIVY_SECRET');
    if (!appId || !appSecret) {
      throw new Error('Privy credentials missing');
    }
    this.privyClient = new PrivyClient({
    appId: appId,
    appSecret: appSecret,
    });

    const jwksUrl = this.configService.get<string>(
      'PRIVY_JWKS_URL',
      `https://auth.privy.io/api/v1/apps/${appId}/jwks.json`,
    );

    this.jwks = jose.createRemoteJWKSet(new URL(jwksUrl));
  }
  
  //verify token
  async verifyToken(token: string) {
    console.log('TOKEN', token);
    console.log('PRIVY_BYPASS', process.env.PRIVY_BYPASS);
    if (process.env.PRIVY_BYPASS === 'true' && token === 'debugtoken') {
      console.log('Using PRIVY_BYPASS mode');
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
  async getUser(privyId: string) {
    if (process.env.PRIVY_BYPASS === 'true' && privyId === 'did:privy:test-user-123') {
    return {
      id: 'did:privy:test-user-123',
      linked_accounts: [
        {
          type: 'wallet',
          address: '0x123456789abcdef0123456789abcdef012345678',
        },
      ],
    };
  }
    try {
      const user = await this.privyClient.users()._get(privyId);
      return user;
    } catch (error) {
      this.logger.error(`Privy getUser failed: ${error.message}`);
      throw new AppException('Failed to fetch user from Privy', 401);
    }
  }
}
