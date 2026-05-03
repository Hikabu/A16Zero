import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtAuthGuard } from '../auth-employer/guards/jwt-auth.guard';
import { EscrowController } from './escrow.controller';
import { EscrowService } from './escrow.service';
import { SolanaService } from './solana.service';

@Module({
  imports: [ConfigModule],
  controllers: [EscrowController],
  providers: [EscrowService, SolanaService, JwtAuthGuard],
  exports: [SolanaService],
})
export class EscrowModule {}
