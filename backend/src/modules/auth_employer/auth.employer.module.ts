import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthEmployerService } from './auth.employer.service';
import { AuthEmployerController } from './auth.employer.controller';
import { PrivyService } from './privy.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [AuthEmployerController],
  providers: [AuthEmployerService, PrivyService, JwtStrategy],
  exports: [AuthEmployerService],
})
export class AuthEmployerModule {}
