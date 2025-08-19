import compression from 'compression';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Application, Request, Response, Router, Express } from 'express';
import Redis from 'ioredis';
import { Morgan } from 'morgan';
import { PassportStatic } from 'passport';
import { Pool } from 'pg';
import { InjectionToken } from 'tsyringe';
import * as schema from '~/app/shared/services/db/drizzle/schema';

const Tokens = {
  // app
  APP: 'app' as InjectionToken<Application>,

  // middlewares
  MORGAN: 'morgan' as InjectionToken<Morgan<Request, Response>>,
  PASSPORT: 'passport' as InjectionToken<PassportStatic>,
  COMPRESSION: 'compression' as InjectionToken<typeof compression>,

  // infra
  DRIZZLE_DB: 'drizzle_db' as InjectionToken<NodePgDatabase<typeof schema>>,
  DB_POOL: 'db_pool' as InjectionToken<Pool>,
  REDIS: 'redis' as InjectionToken<Redis>,

  // router
  GOALS_ROUTER: 'goals_router' as InjectionToken<Router>,
  AUTH_ROUTER: 'auth-router' as InjectionToken<Router>,
};

export { Tokens };
