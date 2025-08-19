import express, { Router } from 'express';
import { container } from 'tsyringe';
import { Tokens } from './tokens';
import { Env, Logger } from '~/app/shared/config';
import { Pool } from 'pg';
import IoRedis from 'ioredis';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '~/app/shared/services/db/drizzle';
import morgan from 'morgan';
import passport from 'passport';
import compression from 'compression';

const env = container.resolve(Env);
const logger = container.resolve(Logger);

function registerApp() {
  const app = express();
  container.register(Tokens.APP, { useValue: app });
}

function registerRouters() {
  container.register(Tokens.GOALS_ROUTER, {
    useValue: Router({ mergeParams: true }),
  });
  container.register(Tokens.AUTH_ROUTER, {
    useValue: Router({ mergeParams: true }),
  });
}

function registerInfra() {
  const dbPool = new Pool({
    user: env.database.DB_USER,
    password: env.database.DB_PASSWORD,
    host: env.database.DB_HOST,
    port: env.database.DB_PORT,
    database: env.database.DB_NAME,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    keepAlive: true,
  });

  const drizzleDb = drizzle(dbPool, {
    logger: !env.isProd,
    schema,
  });

  const redisClient = new IoRedis({
    host: env.storage.REDIS_HOST,
    port: env.storage.REDIS_PORT,
    password: env.storage.REDIS_PASSWORD,
    // Retry with backoff, cap attempts
    retryStrategy: (times) => {
      if (times > 5) {
        logger.error('Too many reconnect attempts to Redis');
        return null; // stop retrying
      }
      const delay = Math.min(times * 200, 2000);
      logger.warn(`Reconnecting to Redis in ${delay}ms (attempt ${times})`);
      return delay;
    },
  });

  container.register(Tokens.DRIZZLE_DB, { useValue: drizzleDb });
  container.register(Tokens.DB_POOL, { useValue: dbPool });
  container.register(Tokens.REDIS, { useValue: redisClient });
}

function registerMiddlewares() {
  container.register(Tokens.MORGAN, { useValue: morgan });
  container.register(Tokens.PASSPORT, { useValue: passport });
  container.register(Tokens.COMPRESSION, { useValue: compression });
}

function registerContainers() {
  registerApp();
  registerRouters();
  registerInfra();
  registerMiddlewares();
}

export { registerContainers };
