import z from 'zod';

export const envSchema = z.object({
  // Database
  MONGO_URL: z.string(),
  MONGO_DB_NAME: z.string(),

  // App
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number(),

  // Redis
  REDIS_USERNAME: z.string(),
  REDIS_PASSWORD: z.string(),
  REDIS_HOST: z.string(),
  REDIS_PORT: z.coerce.number(),

  // Google
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GOOGLE_CALLBACK_URL: z.string(),

  // OAuth Redirect/Cookies
  FRONTEND_ALLOWED_ORIGINS: z.string(),
  OAUTH_STATE_SECRET: z.string(),
  OAUTH_ERROR_PATH: z.string().default('/signup/google/callback'),
  AUTH_COOKIE_DOMAIN: z.string().optional(),
  AUTH_COOKIE_SECURE: z.coerce.boolean().default(false),
  ACCESS_COOKIE_MAX_AGE_SECONDS: z.coerce.number().default(15 * 60),
  REFRESH_COOKIE_MAX_AGE_SECONDS: z.coerce
    .number()
    .default(30 * 24 * 60 * 60),

  // GIthub
  GITHUB_CLIENT_ID: z.string(),
  GITHUB_CLIENT_SECRET: z.string(),
  GITHUB_CALLBACK_URL: z.string(),

  // Jwt
  JWT_ACCESS_SECRET: z.string(),
  JWT_REFRESH_SECRET: z.string(),

  // Email
  SENDER_EMAIL: z.string(),
  SENDER_EMAIL_PASSWORD: z.string(),
  SENDGRID_API_KEY: z.string(),
  SENDGRID_SENDER: z.string(),
});

export type Env = z.infer<typeof envSchema>;
