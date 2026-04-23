import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const registerSchema = z
  .object({
    email: z.string().email().optional().describe('Valid email address'),
    username: z.string().min(3).optional().describe('Unique username'),
    password: z
      .string()
      .min(8)
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(
        /[^A-Za-z0-9]/,
        'Password must contain at least one special character',
      )
      .describe('Secure password with complexity requirements'),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    role: z
      .enum(['CANDIDATE', 'RECRUITER'])
      .describe('User role in the system'),
  })
  .refine((data) => data.email || data.username, {
    message: 'Email or username required',
  });

export class RegisterDto extends createZodDto(registerSchema) {}
