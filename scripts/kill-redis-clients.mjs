/**
 * Kills all Redis client connections except the current one.
 * Run this when "ERR max number of clients reached" prevents the server from starting.
 *
 * Usage:  node scripts/kill-redis-clients.mjs
 */

import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

function loadEnv() {
  const raw = readFileSync(resolve(__dirname, '../.env'), 'utf8');
  const env = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
  }
  return env;
}

async function main() {
  const env = loadEnv();
  const Redis = require('ioredis');

  const redis = new Redis({
    host: env.REDIS_HOST,
    port: Number(env.REDIS_PORT),
    username: env.REDIS_USERNAME || undefined,
    password: env.REDIS_PASSWORD || undefined,
    tls: env.NODE_ENV === 'production' ? {} : undefined,
    connectTimeout: 10000,
    maxRetriesPerRequest: 3,
  });

  const list = await redis.client('LIST');
  const myId = await redis.client('ID');

  const ids = list
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/\bid=(\d+)/);
      return m ? Number(m[1]) : null;
    })
    .filter((id) => id !== null && id !== Number(myId));

  console.log(`Found ${ids.length + 1} connections. Killing ${ids.length} (keeping current).`);

  for (const id of ids) {
    await redis.client('KILL', 'ID', id).catch(() => {});
  }

  console.log('Done. You can now restart the server.');
  await redis.quit();
}

main().catch((err) => { console.error(err); process.exit(1); });
