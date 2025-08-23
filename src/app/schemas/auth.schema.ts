import z from 'zod';

export const signUpSchema = z.object({
  name: z.string().min(3),
  email: z.string().trim(),
  password: z.string().min(3),
});

export const loginSchema = z.object({
  email: z.string().trim(),
  password: z.string().min(3),
});
