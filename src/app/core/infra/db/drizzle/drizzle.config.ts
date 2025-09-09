import 'reflect-metadata';
import { defineConfig } from 'drizzle-kit';
import { Env } from '@shared/config';

class DrizzleConfig {
  constructor(private readonly env: Env) {}

  public createConfig() {
    return defineConfig({
      out: 'src/app/core/infra/db/drizzle/migrations',
      schema: 'src/app/core/infra/db/drizzle/schema',
      dialect: 'postgresql',
      dbCredentials: {
        host: this.env.database.DB_HOST,
        password: this.env.database.DB_PASSWORD,
        user: this.env.database.DB_USER,
        port: this.env.database.DB_PORT,
        database: this.env.database.DB_NAME,
        ssl: false,
      },
    });
  }
}

const drizzleConfig = new DrizzleConfig(new Env());
export default drizzleConfig.createConfig();
