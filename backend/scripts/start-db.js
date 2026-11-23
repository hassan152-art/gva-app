/**
 * Starts the LOCAL DEVELOPMENT PostgreSQL server. Development only —
 * production uses the hosted database in DATABASE_URL and never runs this.
 *
 * Two environment constraints shape this file:
 *
 * 1. The bundled PostgreSQL binaries need the Microsoft VC++ runtime; on a
 *    machine without the redistributable, postgres.exe exits 0xC0000135.
 *    scripts/ensure-vcruntime.js copies the runtime next to postgres.exe.
 *
 * 2. This shell runs as SYSTEM. postgres.exe refuses to start with an
 *    administrative token, and neither restricted tokens (runas /trustlevel)
 *    nor Start-Process -Credential work here (the latter fails with
 *    0xC0000142). So the server is launched through Task Scheduler under a
 *    dedicated unprivileged local account, which also gives it a clean,
 *    non-admin token. The account needs "Log on as a batch job"; if the right
 *    is missing this script reports exactly what to run.
 *
 * The cluster lives in backend/.pgdata and the server is started detached,
 * so it keeps running after this script exits.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
dotenv.config({ path: join(root, '.env'), quiet: true });

const dataDir = join(root, '.pgdata');
const logFile = join(root, 'db-server.log');
const port = Number(process.env.PGPORT || 5432);
const user = process.env.PGUSER || 'postgres';
const password = process.env.PGPASSWORD || 'postgres';
const database = process.env.PGDATABASE || 'gva';

const binDir = join(root, 'node_modules', '@embedded-postgres', 'windows-x64', 'native', 'bin');
const initdb = join(binDir, 'initdb.exe');
const pgCtl = join(binDir, 'pg_ctl.exe');

const ACCOUNT = process.env.GVA_PG_ACCOUNT || 'gvapg';
const ACCOUNT_PASSWORD = process.env.GVA_PG_ACCOUNT_PASSWORD || 'GvaPg2026dev!';
const TASK_NAME = 'GvaAppStartPostgres';
const taskDir = join(process.argv[2] === '--task' ? process.env.TEMP : root, '');
const stageDir = join(root, '.pg-tmp');
const stageOut = join(stageDir, 'gva-pg-start.out');

const sh = (cmd, args) => spawnSync(cmd, args, { encoding: 'utf8', windowsHide: true });
mkdirSync(stageDir, { recursive: true });

sh('icacls', [
  stageDir,
  '/grant',
  `${ACCOUNT}:(OI)(CI)M`,
  '/T',
  '/C',
  '/Q'
]);

function isUp() {
  return sh(pgCtl, ['status', '-D', dataDir]).status === 0;
}

/**
 * Run a command as the unprivileged account through Task Scheduler.
 * The command goes in a staged .bat because /TR is limited to 261 characters.
 * Output is redirected to a world-writable staging path we can read back.
 */
function runAsAccount(commandLine, label, batName = 'gva-pg-step.bat') {
  rmSync(stageOut, { force: true });
  const bat = join(stageDir, batName);
  writeFileSync(bat, `@echo off\r\n${commandLine} > "${stageOut}" 2>&1\r\n`, 'ascii');
  sh('icacls', [bat, '/grant', `${ACCOUNT}:RX`, '/C', '/Q']);

  const result = sh('schtasks', [
    '/Create', '/TN', TASK_NAME, '/TR', bat,
    '/SC', 'ONCE', '/ST', '23:59', '/RU', ACCOUNT, '/RP', ACCOUNT_PASSWORD, '/F',
  ]);
  if (result.status !== 0) {
    throw new Error(`cannot register task for ${ACCOUNT}: ${result.stderr || result.stdout}`);
  }
  const run = sh('schtasks', ['/Run', '/TN', TASK_NAME]);
  if (run.status !== 0) {
    throw new Error(`cannot run task: ${run.stderr || run.stdout}`);
  }
  // Poll Task Scheduler until the run finishes.
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const query = sh('schtasks', ['/Query', '/TN', TASK_NAME, '/V', '/FO', 'LIST']);
    const status = /Status:\s+(.*)/.exec(query.stdout)?.[1]?.trim() || '';
    const exit = /Last Result:\s+(.*)/.exec(query.stdout)?.[1]?.trim() || '';
    if (status && status !== 'Running' && status !== 'Queued' && exit) {
      const out = readOut();
      sh('schtasks', ['/Delete', '/TN', TASK_NAME, '/F']);
      if (exit !== '0') {
        throw new Error(`${label} failed (exit ${exit})${out ? `:\n${out}` : ''}`);
      }
      return out;
    }
    sleep(400);
  }
  sh('schtasks', ['/Delete', '/TN', TASK_NAME, '/F']);
  throw new Error(`${label} timed out${readOut() ? `:\n${readOut()}` : ''}`);
}

function readOut() {
  return existsSync(stageOut) ? readFileSync(stageOut, 'utf8').trim() : '';
}

function sleep(ms) {
  AtomicsWait(ms);
}
function AtomicsWait(ms) {
  const shared = new SharedArrayBuffer(4);
  Atomics.wait(new Int32Array(shared), 0, 0, ms);
}

// ---------------------------------------------------------------------------

if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

// Grant the service account control of the data directory and log file.
sh('icacls', [dataDir, '/grant', `${ACCOUNT}:(OI)(CI)F`, '/T', '/C', '/Q']);
if (!existsSync(logFile)) writeFileSync(logFile, '');
sh('icacls', [logFile, '/grant', `${ACCOUNT}:F`, '/C', '/Q']);

if (isUp()) {
  console.log(`[db] already running on port ${port}`);
  process.exit(0);
}

// First run: initialise the cluster under the service account.
if (!existsSync(join(dataDir, 'PG_VERSION'))) {
  const pwFile = join(stageDir, 'gva-pgpw.txt');
  writeFileSync(pwFile, password, 'utf8');
  sh('icacls', [pwFile, '/grant', `${ACCOUNT}:R`, '/C', '/Q']);
sh('icacls', [
  pwFile,
  '/grant',
  `${process.env.USERDOMAIN}\\${process.env.USERNAME}:F`,
  '/C',
  '/Q'
]);
  try {
    runAsAccount(
      `"${initdb}" -D "${dataDir}" -U ${user} --pwfile="${pwFile}" -A password -E UTF8 --locale=C`,
      'initdb'
    );
    console.log('[db] cluster initialised');
  } finally {
    rmSync(pwFile, { force: true });
  }
}

// Start detached via pg_ctl so the server outlives the task.
runAsAccount(
  `"${pgCtl}" start -D "${dataDir}" -l "${logFile}" -w -t 90 -o "-p ${port} -c listen_addresses=127.0.0.1"`,
  'pg_ctl start'
);

// Create the application database if it does not exist yet.
const { default: pg } = await import('pg');
const client = new pg.Client({ host: '127.0.0.1', port, user, password, database: 'postgres' });
await client.connect();
const { rows } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [database]);
if (rows.length === 0) {
  await client.query(`CREATE DATABASE "${database}"`);
  console.log(`[db] created database "${database}"`);
}
await client.end();

console.log(`[db] ready at postgres://${user}@127.0.0.1:${port}/${database}`);
console.log('[db] local development only — production uses DATABASE_URL');
