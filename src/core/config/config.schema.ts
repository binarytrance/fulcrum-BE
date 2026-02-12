import z from 'zod';

export const envSchema = z.object({
  MONGO_URL: z.string(),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number(),
});

export type Env = z.infer<typeof envSchema>;
