import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { GithubStrategy } from './strategies/github.strategy';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshStrategy } from './strategies/refresh.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { GithubLinkGuard } from './guards/github.link.guard';
import { GoogleLinkGuard } from './guards/google.link.guard';
import { ConfigModule } from '@nestjs/config';
import authConfig from './auth.config';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [authConfig]
    }),
  ],
  controllers: [
    AuthController
  ],
  providers: [
    AuthService, 
    GithubStrategy,
    GoogleStrategy,
    JwtStrategy,
    GithubLinkGuard,
    GoogleLinkGuard,
    RefreshStrategy
  ],
})
export class AuthModule {}