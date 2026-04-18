import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { PrivyService } from './privy.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private privyService: PrivyService,
    private jwtService: JwtService,
  ) {}

  async login(token: string, body: LoginDto) {
    const { privyId, email } = await this.privyService.verifyToken(token);

    // Find or create company
    let company = await this.prisma.company.findUnique({
      where: { privyId },
    });

    if (!company) {
      company = await this.prisma.company.create({
        data: {
          privyId,
          name: 'New Company',
          country: 'Unknown',
          isVerified: true,
          walletAddress: body.walletAddress,
          smartAccountAddress: body.smartAccountAddress,
        },
      });
    } else if (body.walletAddress && !company.walletAddress) {
      company = await this.prisma.company.update({
        where: { id: company.id },
        data: { walletAddress: body.walletAddress },
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
