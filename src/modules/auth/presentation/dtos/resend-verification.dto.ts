import { z } from 'zod';

export const ResendVerificationSchema = z.object({
  email: z.email(),
});

export type ResendVerificationDto = z.infer<typeof ResendVerificationSchema>;
