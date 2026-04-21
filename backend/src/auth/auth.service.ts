import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { PrivyService } from './privy.service';
import { LoginDto } from './dto/login.dto';
import { UnauthorizedException } from '@nestjs/common';

/*
  Login via Privy on the frontend to get the accessToken

  Call POST /auth/login and put that token in the Authorization header as a Bearer token

  The backend will verify it, find/create your company record using the Privy ID, and return a new token

  Use this new token for all future requests to the API
*/
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private privyService: PrivyService,
    private jwtService: JwtService,
  ) {}

  async login(token: string, body: LoginDto) {
    console.log("LOGIN: ", token,"body:", body);
    const { privyId, email } = await this.privyService.verifyToken(token);

    if (!privyId) {
      throw new UnauthorizedException('Invalid Privy token');
    }
    // Find or create company
    let company = await this.prisma.company.findUnique({
      where: { privyId },
    });
    console.log("company1: ", company);

    if (!company) {
      const privyUser = await this.privyService.getUser(privyId);
      const wallet =
        privyUser.linkedAccounts?.find(acc => acc.type === 'wallet');
      if (!wallet) {
        throw new UnauthorizedException('No wallet linked to Privy user');
      }
        company = await this.prisma.company.create({
        data: {
          privyId,
          email,
          name: 'New company',
          country: 'Unknown',
          isVerified: true,
          // WALLET COMES FROM PRIVY, NOT FRONTEND
          walletAddress: wallet.address,
          smartAccountAddress: wallet.smartWalletAddress ?? null,
          },
        });
    }
    const payload = { 
      sub: company.id, 
      walletAddress: company.walletAddress,
      privyId: company.privyId 
    };

    return {
      accessToken: this.jwtService.sign(payload),
    };
  }
}
