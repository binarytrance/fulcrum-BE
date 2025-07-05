import { Pool } from 'pg';
import { env } from '~/data/env';
import { drizzle } from 'drizzle-orm/node-postgres';

export const pool = new Pool({
  user: env.DATABASE.DB_USER,
  password: env.DATABASE.DB_PASSWORD,
  host: env.DATABASE.DB_HOST,
  port: env.DATABASE.DB_PORT,
  database: env.DATABASE.DB_NAME,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  keepAlive: true,
});
export const db = drizzle(pool);
