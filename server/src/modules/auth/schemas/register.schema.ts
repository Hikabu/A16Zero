import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email().optional(),
  username: z.string().min(3).optional(),
  password: z.string().min(6),
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