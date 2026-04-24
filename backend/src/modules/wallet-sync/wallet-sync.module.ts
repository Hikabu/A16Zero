import { Module } from '@nestjs/common';
import { WalletSyncController } from './wallet-sync.controller';
import { WalletSyncService } from './wallet-sync.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../../redis/redis.module';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [WalletSyncController],
  providers: [WalletSyncService],
  exports: [WalletSyncService],
})
export class WalletSyncModule {}
