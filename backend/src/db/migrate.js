/**
 * Minimal forward-only migration runner.
 *
 *   node src/db/migrate.js            apply pending migrations
 *   node src/db/migrate.js --reset    drop the public schema first (dev only)
 *
 * Each .sql file in backend/migrations runs in its own transaction and is
 * recorded in schema_migrations, so re-running is a no-op.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import env from '../config.js';
import { pool } from './index.js';

const dir = join(env.root, 'migrations');
const reset = process.argv.includes('--reset');

async function main() {
  if (reset) {
    if (env.nodeEnv === 'production') {
      throw new Error('refusing to --reset in production');
    }
    await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    console.log('[migrate] schema reset');
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
  const { rows } = await pool.query('SELECT name FROM schema_migrations');
  const done = new Set(rows.map((r) => r.name));

  let applied = 0;
  for (const file of files) {
    if (done.has(file)) {
      console.log(`[migrate] skip ${file}`);
      continue;
    }
    const sql = await readFile(join(dir, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`[migrate] applied ${file}`);
      applied += 1;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`[migrate] FAILED ${file}: ${err.message}`);
      throw err;
    } finally {
      client.release();
    }
  }
  console.log(`[migrate] done — ${applied} applied, ${files.length - applied} skipped`);
  await pool.end();
}

main().catch(async (err) => {
  console.error(err.message);
  await pool.end().catch(() => {});
  process.exit(1);
});
