import { z } from 'zod';

export const ResetPasswordSchema = z.object({
  email: z.string().email(),
  token: z.string().nonempty(),
  newPassword: z.string().min(6),
});

export type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>;
