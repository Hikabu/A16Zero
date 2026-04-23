import { Controller, Post, Body, Headers, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthEmployerService } from './auth.employer.service';
import { LoginDto } from './dto/login.dto';
import { BaseController } from '../../shared/config/common/base.controller';
import { Public } from './decorators/public.decorator';
import { AppException } from '../../shared/config/common/app.exception';

@ApiTags('Authentication')
@Controller('auth/employer')
export class AuthEmployerController extends BaseController {
  constructor(private readonly authService: AuthEmployerService) {
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
    if (!authHeader) {
      throw new AppException('No authorization header found', 401);
    }
    // console.log("header: ", authHeader);
    const token = authHeader?.replace('Bearer ', '');
    // console.log("1. token: ", token);
    const result = await this.authService.login(token, loginDto);
    return this.handleSuccess(result, 'Logged in successfully');
  }
}
