import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const onboardingSchema = z.object({
  username: z.string().describe('Unique public username').min(3).max(20),
});

export class OnboardingDto extends createZodDto(onboardingSchema) {}