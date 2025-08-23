import 'dotenv/config';
import { singleton } from 'tsyringe';
import { object, z } from 'zod';

@singleton()
export class Env {
  private readonly configs: ReturnType<typeof this.loadConfig>;

  constructor() {
    this.configs = this.loadConfig();
  }

  public get app() {
    return this.configs.APP;
  }

  public get database() {
    return this.configs.DATABASE;
  }

  public get storage() {
    return this.configs.STORAGE;
  }

  public get github() {
    return this.configs.GITHUB;
  }

  public get google() {
    return this.configs.GOOGLE;
  }

  public get isProd() {
    return this.configs.APP.NODE_ENV === 'production';
  }

  private get rawEnv() {
    const rawEnv = {
      APP: {
        NAME: process.env.NAME,
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT,
        HOST: process.env.HOST,
        SESSION_SECRET: process.env.SESSION_SECRET,
        SESSION_NAME: process.env.SESSION_NAME,
      },
      DATABASE: {
        DB_PASSWORD: process.env.DB_PASSWORD,
        DB_USER: process.env.DB_USER,
        DB_HOST: process.env.DB_HOST,
        DB_PORT: process.env.DB_PORT,
        DB_NAME: process.env.DB_NAME,
      },
      STORAGE: {
        REDIS_PASSWORD: process.env.REDIS_PASSWORD,
        REDIS_HOST: process.env.REDIS_HOST,
        REDIS_PORT: process.env.REDIS_PORT,
      },
      GITHUB: {
        CLIENT_ID: process.env.GITHUB_CLIENT_ID,
        CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
      },
      GOOGLE: {
        CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
        CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
      },
    } as const;

    return rawEnv;
  }

  private get schema() {
    const schema = z.object({
      APP: z.object({
        NAME: z.string().min(3),
        NODE_ENV: z
          .enum(['development', 'production', 'test'])
          .default('development'),
        PORT: z.coerce.number().default(6969),
        HOST: z.string().min(3),
        SESSION_SECRET: z.string().min(3),
        SESSION_NAME: z.string().min(3),
      }),
      DATABASE: z.object({
        DB_PASSWORD: z.string().min(3),
        DB_USER: z.string().min(3),
        DB_HOST: z.string().min(3),
        DB_PORT: z.coerce.number().min(4),
        DB_NAME: z.string().min(3),
      }),
      STORAGE: z.object({
        REDIS_PASSWORD: z.string().min(3),
        REDIS_HOST: z.string().min(3),
        REDIS_PORT: z.coerce.number().min(4),
      }),
      GITHUB: z.object({
        CLIENT_ID: z.string().min(3),
        CLIENT_SECRET: z.string().min(3),
      }),
      GOOGLE: z.object({
        CLIENT_ID: z.string().min(3),
        CLIENT_SECRET: z.string().min(3),
      }),
    });

    return schema;
  }

  private loadConfig() {
    return Object.freeze(this.schema.parse(this.rawEnv));
  }
}
