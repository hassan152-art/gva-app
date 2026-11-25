/**
 * Run the API against the LOCAL database only (never the live one).
 *
 *   npm run dev:local        (from backend/)
 *
 * 1. Starts the bundled PostgreSQL in backend/.pgdata (port 5432) if it is not running.
 * 2. Applies pending migrations to that local database.
 * 3. Starts the API on http://127.0.0.1:4000 with file watching.
 *
 * DATABASE_URL is cleared before .env is read, so the live database in .env
 * is ignored for this process.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import net from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import EmbeddedPostgres from 'embedded-postgres';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const PORT = 5432;

const env = {
  ...process.env,
  DATABASE_URL: '',
  PGSSL: 'false',
  PGHOST: '127.0.0.1',
  PGPORT: String(PORT),
  PGUSER: 'postgres',
  PGPASSWORD: 'postgres',
  PGDATABASE: 'gva',
  KAFALAT_FORM_SECRET: process.env.KAFALAT_FORM_SECRET || 'local-test-secret',
};

function portOpen(port) {
  return new Promise((resolve) => {
    const s = net.connect(port, '127.0.0.1');
    s.once('connect', () => {
      s.end();
      resolve(true);
    });
    s.once('error', () => resolve(false));
  });
}

let pg = null;
if (await portOpen(PORT)) {
  console.log(`[dev-local] PostgreSQL already running on ${PORT}`);
} else {
  const dataDir = join(root, '.pgdata');
  if (!existsSync(dataDir)) {
    console.error('[dev-local] backend/.pgdata not found — run "npm run setup" once first.');
    process.exit(1);
  }
  pg = new EmbeddedPostgres({ databaseDir: dataDir, user: 'postgres', password: 'postgres', port: PORT, persistent: true });
  await pg.start();
  console.log(`[dev-local] PostgreSQL started on ${PORT}`);
}

function run(args) {
  return new Promise((resolve, reject) => {
    const p = spawn(process.execPath, args, { cwd: root, env, stdio: 'inherit' });
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${args.join(' ')} exited ${code}`))));
  });
}

await run(['src/db/migrate.js']);
console.log('[dev-local] API → http://127.0.0.1:4000 (local database)');
const api = spawn(process.execPath, ['--watch', 'src/server.js'], { cwd: root, env, stdio: 'inherit' });

async function stop() {
  api.kill();
  if (pg) await pg.stop().catch(() => {});
  process.exit(0);
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
api.on('exit', () => stop());
