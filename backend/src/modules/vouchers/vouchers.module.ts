import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScoringModule } from '../../modules/scoring/scoring.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { VoucherQualityService } from './voucher-quality.service';
import { VouchesService } from './vouches.service';
import { VouchesController } from './vouches.controller';

@Module({
  imports: [
    ConfigModule,
    ScoringModule, // provides SolanaAdapterService (already exported)
    PrismaModule,
  ],
  controllers: [VouchesController],
  providers: [VoucherQualityService, VouchesService],
  exports: [VoucherQualityService, VouchesService],
})
export class VouchersModule {}
