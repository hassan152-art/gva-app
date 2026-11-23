/**
 * Local development database.
 *
 * Starts/stops a real PostgreSQL server (bundled binaries, no system install)
 * on the port from .env, with its data directory inside backend/.pgdata.
 * This is ONLY for local development — production connects to the hosted
 * Postgres given in DATABASE_URL and never runs this file.
 *
 *   node scripts/local-db.js up
 *   node scripts/local-db.js down
 */
import EmbeddedPostgres from 'embedded-postgres';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
dotenv.config({ path: join(root, '.env'), quiet: true });

const dataDir = join(root, '.pgdata');
const port = Number(process.env.PGPORT || 5432);
const user = process.env.PGUSER || 'postgres';
const password = process.env.PGPASSWORD || 'postgres';
const database = process.env.PGDATABASE || 'gva';

if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user,
  password,
  port,
  persistent: true,
});

const action = process.argv[2] || 'up';

if (action === 'up') {
  const alreadyRunning = existsSync(join(dataDir, 'postmaster.pid'));
  let started = false;
  try {
    await pg.start();
    started = true;
  } catch (err) {
    // The wrapper sometimes throws an empty value; report whatever we have.
    const detail = err?.message || err?.toString?.() || String(err) || 'unknown error';
    if (alreadyRunning) {
      console.log(`[db] already running on port ${port}`);
    } else {
      console.error('[db] failed to start:', detail);
      process.exit(1);
    }
  }
  if (started) {
    try {
      await pg.createDatabase(database);
      console.log(`[db] created database "${database}"`);
    } catch (err) {
      console.log(`[db] database "${database}" already present`);
    }
  }
  console.log(`[db] postgres ready at postgres://${user}@127.0.0.1:${port}/${database}`);
  process.exit(0);
}

if (action === 'down') {
  try {
    await pg.stop();
    console.log('[db] stopped');
  } catch {
    console.log('[db] was not running');
  }
  process.exit(0);
}

console.error(`unknown action "${action}" — use up or down`);
process.exit(1);
