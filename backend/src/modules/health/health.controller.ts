import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('System')
@Controller('health')
export class HealthController {
  @Get()
  @SkipThrottle()
  check() {
    return { status: 'ok' };
  }
}
