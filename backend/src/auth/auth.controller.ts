import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, AuthResponseDto } from './dto/login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with Privy token and receive backend JWT' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}
