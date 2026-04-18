import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrivyClient, verifyAccessToken } from '@privy-io/node';
import { PrismaService } from '../prisma/prisma.service';
import { SmartAccountService } from '../web3/smart-account.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private privy: PrivyClient;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
    private smartAccountService: SmartAccountService,
  ) {
    this.privy = new PrivyClient({
      appId: this.configService.get<string>('PRIVY_APP_ID')!,
      appSecret: this.configService.get<string>('PRIVY_SECRET')!,
    });
  }

  async login(loginDto: LoginDto) {
    try {
      // 1. Verify Privy token
      // For Phase 1 Playground, we assume the verification key is available or we use app secret if allowed
      // In @privy-io/node 0.15.0, we use verifyAccessToken function
      const verifiedClaims = await verifyAccessToken({
        access_token: loginDto.privy_access_token,
        app_id: this.configService.get<string>('PRIVY_APP_ID')!,
        verification_key: this.configService.get<string>('PRIVY_SECRET')!,
      });
      const privyId = verifiedClaims.user_id;

      // 2. Predict Smart Account Address
      const walletAddress = await this.smartAccountService.predictSmartAccountAddress(privyId);

      // 3. Find or create Company
      let company = await this.prisma.company.findUnique({
        where: { privyId },
      });

      if (!company) {
        // In this playground phase, we auto-create a company
        // In production, there would be a registration step
        company = await this.prisma.company.create({
          data: {
            name: `Company ${privyId.substring(0, 8)}`,
            country: 'Unknown',
            privyId,
            walletAddress,
          },
        });
      } else if (company.walletAddress !== walletAddress) {
        // Update wallet address if prediction changed (should not happen with stable salt)
        company = await this.prisma.company.update({
          where: { id: company.id },
          data: { walletAddress },
        });
      }

      // 4. Issue JWT
      const payload = { sub: company.id, walletAddress: company.walletAddress };
      
      return {
        access_token: this.jwtService.sign(payload),
        company: {
          id: company.id,
          name: company.name,
          walletAddress: company.walletAddress,
        },
      };
    } catch (error) {
      console.error('Auth error:', error);
      throw new UnauthorizedException('Invalid Privy token');
    }
  }
}
