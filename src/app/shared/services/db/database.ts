import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { Env, Logger } from '~/app/shared/config';
import * as schema from '~/app/shared/services/db/drizzle';
import { sql } from 'drizzle-orm';
import { inject, singleton } from 'tsyringe';
import { Tokens } from '~/app/core/di';

@singleton()
export class Database {
  constructor(
    private readonly env: Env,
    private readonly logger: Logger,
    @inject(Tokens.DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
    @inject(Tokens.DB_POOL) private readonly pool: Pool
  ) {}

  public get connection(): NodePgDatabase<typeof schema> {
    return this.db;
  }

  public async checkConnection(maxRetries = 5, delayMs = 1000): Promise<void> {
    let lastError: Error | null = null;
    const db = this.connection;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await db.execute(sql`SELECT 1`);
        this.logger.info('Database connection successful');
        return;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        this.logger.warn(`DB check failed (attempt ${attempt}/${maxRetries})`, {
          error: lastError.message,
        });
        if (attempt < maxRetries)
          await new Promise((r) => setTimeout(r, delayMs));
      }
    }

    throw new Error(
      `Database connection failed after ${maxRetries} retries: ${lastError?.message}`
    );
  }

  public async end(): Promise<void> {
    await this.pool?.end();
    this.logger.info('Database connection closed.');
  }
}
