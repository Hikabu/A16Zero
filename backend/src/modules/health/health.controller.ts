import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../auth-employer/decorators/public.decorator';

@ApiTags('System')
@Controller('health')
export class HealthController {
  @Get()
  @SkipThrottle()
  @Public()
  check() {
    return { status: 'ok' };
  }
}
