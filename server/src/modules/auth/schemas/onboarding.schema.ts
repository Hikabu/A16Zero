import { z } from 'zod';

export const onboardingSchema = z.object({
  username: z.string().min(3).max(20),
});

export type OnboardingDto = z.infer<typeof onboardingSchema>;