/**
 * Stops the local development PostgreSQL server (see start-db.js).
 * Development only.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
dotenv.config({ path: join(root, '.env'), quiet: true });

const dataDir = join(root, '.pgdata');
const binDir = join(root, 'node_modules', '@embedded-postgres', 'windows-x64', 'native', 'bin');
const pgCtl = join(binDir, 'pg_ctl.exe');

if (!existsSync(join(dataDir, 'PG_VERSION'))) {
  console.log('[db] no cluster to stop');
  process.exit(0);
}

// pg_ctl stop only signals the running server, which already runs as the
// unprivileged account, so it does not trip the admin-token check.
const result = spawnSync(pgCtl, ['stop', '-D', dataDir, '-m', 'fast', '-w', '-t', '60'], {
  encoding: 'utf8',
  windowsHide: true,
});

if (result.status === 0) {
  console.log('[db] stopped');
} else {
  console.log(`[db] stop reported: ${(result.stderr || result.stdout || '').trim() || 'not running'}`);
}
