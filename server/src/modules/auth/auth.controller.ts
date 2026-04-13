import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';

// @Controller('auth')
// export class AuthController {
//   constructor(private readonly authService: AuthService) {}

//   /**
//    * Redirect user to GitHub OAuth
//    */
//   @Get('github')
//   githubLogin() {
//     return this.authService.githubLogin();
//   }

//   /**
//    * GitHub redirects here → exchange code for JWT
//    */
//   @Get('github/callback')
//   githubCallback(@Req() req: any) {
//     return this.authService.githubCallback(req);
//   }

//   /**
//    * POST /auth/refresh
//    * Bearer (refresh token)
//    * Issue new access + refresh tokens
//    */
//   // @UseGuards(RefreshGuard)
//   @Post('refresh')
//   refresh(@Req() req: any) {
//     return this.authService.refresh(req.user);
//   }

//   /**
//    * POST /auth/logout
//    * JWT required
//    * Revoke refresh token
//    */
//   // @UseGuards(JwtAuthGuard)
//   @Post('logout')
//   logout(@Req() req: any) {
//     return this.authService.logout(req.user);
//   }
// }