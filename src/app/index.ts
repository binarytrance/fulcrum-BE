import { sql } from 'drizzle-orm';
import express from 'express';
import { env } from '~/data/env';
import { db } from '~/drizzle';

const app = express();

(async () => {
  try {
    const result = await db.execute(sql`SELECT 1`);
    console.log('DB connection OK!', result.rows);

    app.listen(env.APP.PORT, env.APP.HOST, (err) => {
      if (err) {
        console.error('application failed to start', err);
        process.exit(1);
      }

      console.log(`application started at port: ${env.APP.PORT}`);
    });
  } catch (err) {
    console.error('connection to DB failed!', err);
    process.exit(1);
  }
})();
