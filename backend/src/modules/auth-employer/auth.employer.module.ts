import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthEmployerService } from './auth.employer.service';
import { AuthEmployerController } from './auth.employer.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => ({
        secret: config.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: (config.get<string>('JWT_EXPIRY') || '15m') as any,
        },
      }),
    }),
  ],
  controllers: [AuthEmployerController],
  providers: [AuthEmployerService, JwtStrategy],
  exports: [AuthEmployerService],
})
export class AuthEmployerModule {}
