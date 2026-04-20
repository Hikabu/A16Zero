import { Controller, Post, Body, Headers, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { BaseController } from '../common/base.controller';
import { Public } from './decorators/public.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController extends BaseController {
  constructor(private readonly authService: AuthService) {
    super();
  }

  @Public()
  @Post('login')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Login with Privy token',
    description: 'Verifies Privy access token and returns an application JWT.'
  })
  async login(
    @Headers('authorization') authHeader: string,
    @Body() loginDto: LoginDto,
    
  ) {
    console.log("header: ", authHeader);
    const token = authHeader?.replace('Bearer ', '');
    console.log("1. token: ", token);
    const result = await this.authService.login(token, loginDto);
    return this.handleSuccess(result, 'Logged in successfully');
  }
}
