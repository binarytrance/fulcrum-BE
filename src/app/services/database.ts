import { sql } from 'drizzle-orm';
import { QueryResult } from 'pg';
import { db, pool } from '~/drizzle';
import { DatabaseError, logger } from '~/services';

export class Database {
  private static instance: Database;

  private constructor() {}

  public static getInstance() {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async connect(
    maxRetries: number = 5,
    delayMs: number = 1000,
  ): Promise<QueryResult<Record<string, unknown>>> {
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await db.execute(sql`SELECT 1`);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        logger.warn(`DB check failed on attempt: ${attempt}`, {
          error: lastError.message,
        });
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }
    throw new DatabaseError('Database connection failed after retries', {
      error: lastError?.message,
    });
  }

  public async close() {
    await pool.end();
    logger.info('Database connection closed.');
  }
}
