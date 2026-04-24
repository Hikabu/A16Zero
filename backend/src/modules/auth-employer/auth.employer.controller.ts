import { Controller, Post, Body, Headers } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';

import { AuthEmployerService } from './auth.employer.service';
import { LoginDto } from './dto/login.dto';
import { BaseController } from '../../shared/base.controller';
import { Public } from './decorators/public.decorator';
import { AppException } from '../../shared/app.exception';

class LoginResponseDto {
  accessToken: string;
}

class AuthEmplErrorResponseDto {
  statusCode: number;
  message: string;
  error: string;
}

@ApiTags('Auth (Employer)')
@Controller('auth/employer')
export class AuthEmployerController extends BaseController {
  constructor(private readonly authService: AuthEmployerService) {
    super();
  }

  // ---------------- LOGIN ----------------

  @Public()
  @Post('login')
  @ApiBearerAuth() // 👈 THIS is the correct Swagger way
  @ApiOperation({
    summary: 'Login with Privy token',
    description:
      'Verifies a Privy access token from frontend authentication and returns a signed JWT for API access.',
  })
  @ApiBody({
    type: LoginDto,
    description:
      'Optional login metadata used during company creation or update',
    examples: {
      default: {
        value: {
          smartAccountAddress: '0x123abc...',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Successfully authenticated and returned application JWT',
    type: LoginResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing Privy token',
    type: AuthEmplErrorResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Missing authorization header or invalid request payload',
    type: AuthEmplErrorResponseDto,
  })
  async login(
    @Headers('authorization') authHeader: string,
    @Body() loginDto: LoginDto,
  ) {
    if (!authHeader) {
      throw new AppException('No authorization header found', 401);
    }

    const token = authHeader.replace('Bearer ', '');

    const result = await this.authService.login(token, loginDto);

    return this.handleSuccess(result, 'Logged in successfully');
  }
}
