/**
 * Redis Flush Script — deletes all keys from your Redis instance.
 *
 * Usage:
 *   node scripts/flush-redis.mjs            # flush current DB only (FLUSHDB)
 *   node scripts/flush-redis.mjs --all      # flush ALL databases (FLUSHALL)
 *   node scripts/flush-redis.mjs --pattern=bull:*   # delete keys matching a glob pattern
 *
 * Reads REDIS_HOST, REDIS_PORT, REDIS_USERNAME, REDIS_PASSWORD from .env at the project root.
 */

import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const require = createRequire(import.meta.url);

// ─── Load .env ────────────────────────────────────────────────────────────────

function loadEnv() {
  try {
    const raw = readFileSync(resolve(ROOT, '.env'), 'utf8');
    const env = {};
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
      env[key] = val;
    }
    return env;
  } catch {
    console.error('Could not read .env — ensure it exists at the project root.');
    process.exit(1);
  }
}

// ─── Parse CLI args ───────────────────────────────────────────────────────────

function parseArgs() {
  const flushAll  = process.argv.includes('--all');
  const patternArg = process.argv.find((a) => a.startsWith('--pattern='));
  const pattern = patternArg ? patternArg.slice('--pattern='.length) : null;
  return { flushAll, pattern };
}

// ─── Delete by pattern (SCAN + DEL) ──────────────────────────────────────────

async function deleteByPattern(redis, pattern) {
  console.log(`\nScanning for keys matching: ${pattern}`);
  let cursor = '0';
  let total = 0;

  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
    cursor = nextCursor;
    if (keys.length > 0) {
      await redis.del(...keys);
      total += keys.length;
      process.stdout.write(`\r  Deleted ${total} keys so far...`);
    }
  } while (cursor !== '0');

  console.log(`\r  Done. Deleted ${total} keys matching "${pattern}".`);
  return total;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const env = loadEnv();
  const { flushAll, pattern } = parseArgs();

  const Redis = require('ioredis');

  const redis = new Redis({
    host: env.REDIS_HOST,
    port: Number(env.REDIS_PORT),
    username: env.REDIS_USERNAME || undefined,
    password: env.REDIS_PASSWORD || undefined,
    tls: env.NODE_ENV === 'production' ? {} : undefined,
    maxRetriesPerRequest: 3,
    connectTimeout: 10000,
  });

  redis.on('error', (err) => {
    console.error('Redis connection error:', err.message);
    process.exit(1);
  });

  try {
    // Wait for connection
    await redis.ping();
    console.log(`Connected to Redis at ${env.REDIS_HOST}:${env.REDIS_PORT}`);

    const dbSize = await redis.dbsize();
    console.log(`Current key count: ${dbSize}`);

    if (pattern) {
      // ── pattern mode: SCAN + DEL ──────────────────────────────────────────
      await deleteByPattern(redis, pattern);

    } else if (flushAll) {
      // ── FLUSHALL: wipe every database ─────────────────────────────────────
      console.log('\n⚠  FLUSHALL — wiping ALL Redis databases...');
      await redis.flushall();
      console.log('Done. All databases cleared.');

    } else {
      // ── FLUSHDB: wipe current database (default, safer) ───────────────────
      console.log('\nFLUSHDB — clearing current Redis database...');
      await redis.flushdb();
      console.log(`Done. ${dbSize} key(s) removed.`);
    }

    const remaining = await redis.dbsize();
    console.log(`Keys remaining: ${remaining}`);

  } finally {
    await redis.quit();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
