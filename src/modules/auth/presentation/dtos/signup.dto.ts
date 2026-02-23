import { z } from 'zod';

export const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstname: z.string().nonempty(),
  lastname: z.string().nonempty(),
});

export type SignupDto = z.infer<typeof SignupSchema>;
