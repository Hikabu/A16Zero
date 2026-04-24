import { Module } from '@nestjs/common';
import { WalletSyncController } from './wallet-sync.controller';
import { WalletSyncService } from './wallet-sync.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../../redis/redis.module';
import { ProfileResolverModule } from '../profile-candidate/profile-resolver.module';
@Module({
  imports: [PrismaModule, RedisModule, ProfileResolverModule],
  controllers: [WalletSyncController],
  providers: [WalletSyncService],
  exports: [WalletSyncService],
})
export class WalletSyncModule {}
