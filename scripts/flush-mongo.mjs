/**
 * MongoDB Flush Script — interactively choose which collections to clear.
 *
 * Usage:
 *   node scripts/flush-mongo.mjs              # interactive picker (default)
 *   node scripts/flush-mongo.mjs --drop       # drop the entire database (no prompt)
 *
 * Interactive mode:
 *   - Lists all collections with doc counts
 *   - Type numbers separated by commas/spaces to select (e.g. 1,3,5)
 *   - Type "all" to select every collection
 *   - Type "q" to quit without deleting anything
 *
 * Reads MONGO_URL and MONGO_DB_NAME from .env at the project root.
 */

import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { createInterface } from 'readline';
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

// ─── Readline prompt helper ───────────────────────────────────────────────────

function prompt(rl, question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

// ─── Interactive picker ───────────────────────────────────────────────────────

async function pickCollections(db) {
  const colList = await db.listCollections().toArray();
  if (colList.length === 0) {
    console.log('No collections found — database is already empty.');
    return [];
  }

  // Fetch doc counts in parallel
  const counts = await Promise.all(
    colList.map(({ name }) => db.collection(name).countDocuments()),
  );

  console.log('\nAvailable collections:\n');
  colList.forEach(({ name }, i) => {
    console.log(`  [${i + 1}] ${name.padEnd(35)} ${counts[i]} doc(s)`);
  });
  console.log('\n  [all] Select all collections');
  console.log('  [q]   Quit without deleting\n');

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  let chosen = [];
  while (true) {
    const answer = (await prompt(rl, 'Enter numbers to delete (e.g. 1,2,4), "all", or "q": ')).trim().toLowerCase();

    if (answer === 'q' || answer === 'quit') {
      console.log('Aborted. Nothing deleted.');
      rl.close();
      return [];
    }

    if (answer === 'all') {
      chosen = colList.map(({ name }) => name);
      break;
    }

    const indices = answer
      .split(/[\s,]+/)
      .map((s) => parseInt(s, 10))
      .filter((n) => !isNaN(n));

    const invalid = indices.filter((n) => n < 1 || n > colList.length);
    if (invalid.length > 0) {
      console.log(`  Invalid selection(s): ${invalid.join(', ')} — valid range is 1–${colList.length}`);
      continue;
    }

    if (indices.length === 0) {
      console.log('  No valid numbers entered, try again.');
      continue;
    }

    chosen = indices.map((n) => colList[n - 1].name);
    break;
  }

  rl.close();
  return chosen;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const env = loadEnv();
  const drop = process.argv.includes('--drop');

  const { MongoClient } = require('mongodb');
  const client = new MongoClient(env.MONGO_URL, { connectTimeoutMS: 10000 });

  try {
    await client.connect();
    const dbName = env.MONGO_DB_NAME;
    const db = client.db(dbName);
    console.log(`Connected to MongoDB — database: "${dbName}"`);

    if (drop) {
      // ── Drop entire database (no prompt) ──────────────────────────────────
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      const confirm = await prompt(rl, `\n⚠  DROP entire database "${dbName}"? This cannot be undone. Type "yes" to confirm: `);
      rl.close();
      if (confirm.trim().toLowerCase() !== 'yes') {
        console.log('Aborted.');
        return;
      }
      await db.dropDatabase();
      console.log('Done. Database dropped.');
      return;
    }

    // ── Interactive collection picker ─────────────────────────────────────────
    const selected = await pickCollections(db);
    if (selected.length === 0) return;

    console.log(`\nDeleting documents from: ${selected.join(', ')}\n`);
    let grandTotal = 0;
    for (const name of selected) {
      const { deletedCount } = await db.collection(name).deleteMany({});
      grandTotal += deletedCount;
      console.log(`  ${name}: deleted ${deletedCount} document(s)`);
    }
    console.log(`\nDone. ${grandTotal} total document(s) removed.`);

  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
