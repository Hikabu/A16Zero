import { ZodValidationPipe } from 'nestjs-zod';
import { APP_PIPE } from '@nestjs/core';

export const ZodValidationPipeProvider = {
  provide: APP_PIPE,
  useClass: ZodValidationPipe,
};
