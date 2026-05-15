import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { PublicProfileController } from './profile-public.controller';
import { CacheModule } from '../scoring/cache/cache.module';


@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [ProfileController, PublicProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
