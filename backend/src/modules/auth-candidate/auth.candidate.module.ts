import { Module } from '@nestjs/common';
import { AuthCandidateService } from './auth.candidate.service';
import { AuthCandidateController } from './auth.candidate.controller';
import { GithubStrategy } from './strategies/github.strategy';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshStrategy } from './strategies/refresh.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { GithubLinkGuard } from './guards/github.link.guard';
import { GoogleLinkGuard } from './guards/google.link.guard';
import { ConfigModule } from '@nestjs/config';
import authConfig from './auth.candidate.config';
import { GithubLinkStrategy } from './strategies/github.link.strategy';
import { GoogleLinkStrategy } from './strategies/google.link.strategy';
import { GithubSyncConnectStrategy } from './strategies/github.sync.connect.strategy';

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
    AuthCandidateController
  ],
  providers: [
    AuthCandidateService, 
    GithubStrategy,
    GoogleStrategy,
    GithubLinkStrategy,
    GoogleLinkStrategy,
    GithubSyncConnectStrategy,
    JwtStrategy,
    GithubLinkGuard,
    GoogleLinkGuard,
    RefreshStrategy
  ],
})
export class AuthCandidateModule {}