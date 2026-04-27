import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrivyClient } from '@privy-io/server-auth';
import { AppException } from '../../shared/app.exception';
import { Public } from './decorators/public.decorator';

@Injectable()
@Public()
export class PrivyService {
  private readonly logger = new Logger(PrivyService.name);
  private readonly privyClient: PrivyClient;

  constructor(private configService: ConfigService) {
    const appId = this.configService.get<string>('PRIVY_APP_ID');
    const appSecret = this.configService.get<string>('PRIVY_SECRET');
    if (!appId || !appSecret) {
      throw new Error('Privy credentials missing');
    }
    this.privyClient = new PrivyClient(appId, appSecret);
  }

  async verifyToken(token: string) {
    if (process.env.PRIVY_BYPASS === 'true' && token === 'debugtoken') {
      return {
        privyId: 'did:privy:test-user-123',
        email: 'valeriia@test.com',
      };
    }
    try {
      const verifiedClaims = await this.privyClient.verifyAuthToken(token);
      return {
        privyId: verifiedClaims.userId,
        email: undefined as string | undefined,
      };
    } catch (error) {
      this.logger.error(`Privy token verification failed: ${error.message}`);
      throw new AppException('Invalid or expired Privy token', 401);
    }
  }

  async getUser(privyId: string) {
    if (
      process.env.PRIVY_BYPASS === 'true' &&
      privyId === 'did:privy:test-user-123'
    ) {
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
      const user = await this.privyClient.getUserById(privyId);
      return user;
    } catch (error) {
      this.logger.error(`Privy getUser failed: ${error.message}`);
      throw new AppException('Failed to fetch user from Privy', 401);
    }
  }
}
