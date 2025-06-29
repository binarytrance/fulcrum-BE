import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  APP: z.object({
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    PORT: z.coerce.number().default(6969),
    HOST: z.string().min(3)
  }),
  DATABASE: z.object({
    DB_PASSWORD: z.string().min(3),
    DB_USER: z.string().min(3),
    DB_HOST: z.string().min(3),
    DB_PORT: z.coerce.number().min(4),
    DB_NAME: z.string().min(3),
  }),
});

const rawEnv = {
  APP: {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    HOST: process.env.HOST
  },
  DATABASE: {
    DB_PASSWORD: process.env.DB_PASSWORD,
    DB_USER: process.env.DB_USER,
    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.DB_PORT,
    DB_NAME: process.env.DB_NAME,
  },
} 

export const env = envSchema.parse(rawEnv);
