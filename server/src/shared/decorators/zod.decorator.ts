import { SetMetadata } from '@nestjs/common';
import { z } from 'zod';

export const ZOD_SCHEMA_KEY = 'zod_schema';

export const ZodSchema = (schema: z.ZodType<any>) =>
  SetMetadata(ZOD_SCHEMA_KEY, schema);