import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Application, Router } from 'express';
import Redis from 'ioredis';
import { Pool } from 'pg';
import { InjectionToken } from 'tsyringe';
import * as schema from '@core/infra/db/drizzle';

const Tokens = {
  // app
  APP: 'app' as InjectionToken<Application>,

  // infra
  DRIZZLE_DB: 'drizzle_db' as InjectionToken<NodePgDatabase<typeof schema>>,
  DB_POOL: 'db_pool' as InjectionToken<Pool>,
  REDIS: 'redis' as InjectionToken<Redis>,

  // router
  GOALS_ROUTER: 'goals_router' as InjectionToken<Router>,
  GITHUB_AUTH_ROUTER: 'github-auth-router' as InjectionToken<Router>,
  LOCAL_AUTH_ROUTER: 'local_auth-router' as InjectionToken<Router>,
};

export { Tokens };
