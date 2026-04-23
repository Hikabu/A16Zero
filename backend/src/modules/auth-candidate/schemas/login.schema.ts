import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const loginSchema = z.object({
  identifier: z.string().describe('Email or username').min(1),
  password: z.string().describe('Secret password').min(6),
});

export class LoginDto extends createZodDto(loginSchema) {}