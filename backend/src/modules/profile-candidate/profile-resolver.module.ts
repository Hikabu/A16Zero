// profile-resolver.module.ts
import { Module } from '@nestjs/common';
import { ProfileResolverService } from './profile-resolver.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  providers: [ProfileResolverService, PrismaService],
  exports: [ProfileResolverService], // 👈 IMPORTANT
})
export class ProfileResolverModule {}