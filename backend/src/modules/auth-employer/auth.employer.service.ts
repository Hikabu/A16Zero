import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
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
export class AuthEmployerService {
  constructor(
    private prisma: PrismaService,
    private privyService: PrivyService,
    private jwtService: JwtService,
  ) {}

  async login(token: string, body: LoginDto) {
    // console.log('LOGIN: ', token, 'body:', body);
    const { privyId, email } = await this.privyService.verifyToken(token);

    if (!privyId) {
      throw new UnauthorizedException('Invalid Privy token');
    }


    // Always fetch user from Privy to sync/verify privyId and get wallet address
    const privyUser = await this.privyService.getUser(privyId);
    const walletAccount = privyUser.linked_accounts?.find(
      (acc) => acc.type === 'wallet',
    );
    // Type guard: ensure walletAccount has address property
    const walletAddress =
      walletAccount && 'address' in walletAccount
        ? walletAccount.address
        : null;

    if (!walletAddress) {
      throw new UnauthorizedException('No wallet linked to Privy user');
    }

	const existingByWallet = await this.prisma.company.findUnique({
  where: { walletAddress },
});

const existingBySmart = body.smartAccountAddress
  ? await this.prisma.company.findUnique({
      where: { smartAccountAddress: body.smartAccountAddress },
    })
  : null;

  console.log("e w: ", existingByWallet);
  console.log("e s: ", existingBySmart);
  console.log("equal: ", existingBySmart?.walletAddress == walletAddress);
  console.log("  input: ", walletAddress);
  console.log("current: ", existingBySmart?.walletAddress);

  	console.log("privy id inp: ", privyId);
	  console.log("current id: ", existingBySmart?.privyId);


    // Use upsert keyed on walletAddress to avoid P2002 errors
    const company = await this.prisma.company.upsert({
      where: { walletAddress },
      update: {
        privyId,
        email: email || undefined,
      },
      create: {
        privyId,
        email,
        walletAddress,
        smartAccountAddress: body.smartAccountAddress || walletAddress,
        name: 'New company',
        country: 'Unknown',
        isVerified: true,
      },
    });

    // console.log('Logged in company: ', company);

    const payload = {
      sub: company.id,
      walletAddress: company.walletAddress,
      privyId: company.privyId,
    };

    return {
      accessToken: this.jwtService.sign(payload),
    };
  }
}
