import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email().optional(),
  username: z.string().min(3).optional(),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(['CANDIDATE', 'RECRUITER']),
}).refine(
  (data) => data.email || data.username,
  {
    message: 'Email or username required',
  }
);

export type RegisterDto = z.infer<typeof registerSchema>;