import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScoringModule } from '../../modules/scoring/scoring.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { VoucherQualityService } from './voucher-quality.service';
import { VouchesService } from './vouches.service';
import { VouchesController } from './vouches.controller';
import { BlinkCorsMiddleware } from './blink-cors.middleware';

import { ActionsController } from './actions.controller';

@Module({
  imports: [
    ConfigModule,
    ScoringModule, // provides SolanaAdapterService (already exported)
    PrismaModule,
  ],
  controllers: [VouchesController, ActionsController],
  providers: [VoucherQualityService, VouchesService],
  exports: [VoucherQualityService, VouchesService],
})
export class VouchersModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(BlinkCorsMiddleware).forRoutes('api/actions');
  }
}
