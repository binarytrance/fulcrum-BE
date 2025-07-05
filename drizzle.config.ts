import { defineConfig } from 'drizzle-kit';
import { env } from '~/data/env';

export default defineConfig({
  out: './src/drizzle/migrations',
  schema: './src/drizzle/schema/',
  dialect: 'postgresql',
  dbCredentials: {
    host: env.DATABASE.DB_HOST,
    password: env.DATABASE.DB_PASSWORD,
    user: env.DATABASE.DB_USER,
    port: env.DATABASE.DB_PORT,
    database: env.DATABASE.DB_NAME,
    ssl: false
  },
});
