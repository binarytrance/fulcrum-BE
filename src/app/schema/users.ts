import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(3, 'username should be of at least 3 characters'),
});

export const logoutSchema = z.object({
  username: z.string().min(3, 'username should be of at least 3 characters'),
});

export type LoginBody = z.infer<typeof loginSchema>;
export type LogoutBody = z.infer<typeof logoutSchema>;
