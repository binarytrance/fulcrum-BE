import { z } from 'zod';

export const VerifyEmailSchema = z.object({
  email: z.email(),
  token: z.string().nonempty(),
});

export type VerifyEmailDto = z.infer<typeof VerifyEmailSchema>;
