/**
 * Ensures the bundled PostgreSQL binaries can load on this machine.
 *
 * The @embedded-postgres/windows-x64 binaries link against the Microsoft
 * Visual C++ runtime (vcruntime140, vcruntime140_1, msvcp140, concrt140).
 * On a machine without the VC++ redistributable installed, postgres.exe exits
 * with 0xC0000135 (STATUS_DLL_NOT_FOUND) and the node wrapper surfaces an
 * empty error, which is very hard to diagnose.
 *
 * Windows' loader checks the executable's own directory first, so copying a
 * matching set of runtime DLLs next to postgres.exe fixes it without
 * installing anything system-wide. We copy from the first location on the
 * machine that already ships a complete, current set.
 *
 * Runs automatically before db:up; safe to run repeatedly (no-op when the
 * binaries already load, or on non-Windows platforms).
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DLLS = ['vcruntime140.dll', 'vcruntime140_1.dll', 'msvcp140.dll', 'concrt140.dll'];
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const binDir = join(root, 'node_modules', '@embedded-postgres', 'windows-x64', 'native', 'bin');

if (process.platform !== 'win32') process.exit(0);
if (!existsSync(join(binDir, 'postgres.exe'))) {
  console.error('[vcruntime] embedded postgres binaries not found — run npm install first');
  process.exit(1);
}

/** True when postgres.exe can actually start (i.e. its DLLs resolve). */
function postgresLoads() {
  try {
    execFileSync(join(binDir, 'postgres.exe'), ['--version'], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

if (postgresLoads()) process.exit(0);

/** Directories on this machine that commonly carry the VC++ runtime. */
const candidates = [];
const programFiles = [process.env['ProgramFiles(x86)'], process.env.ProgramFiles].filter(Boolean);
for (const pf of programFiles) {
  const edgeRoot = join(pf, 'Microsoft', 'Edge', 'Application');
  if (existsSync(edgeRoot)) {
    for (const version of readdirSync(edgeRoot).sort().reverse()) {
      candidates.push(join(edgeRoot, version));
    }
  }
  candidates.push(join(pf, 'Microsoft', 'EdgeCore'));
}
if (process.env.LOCALAPPDATA) {
  const tools = join(process.env.LOCALAPPDATA, 'hermes', 'tools');
  if (existsSync(tools)) {
    for (const dir of readdirSync(tools)) {
      candidates.push(join(tools, dir));
    }
  }
}

const source = candidates.find((dir) => DLLS.every((dll) => existsSync(join(dir, dll))));

if (!source) {
  console.error(
    '[vcruntime] postgres.exe cannot start and no complete VC++ runtime set was found.\n' +
      '            Install "Microsoft Visual C++ 2015-2022 Redistributable (x64)" and retry:\n' +
      '            https://aka.ms/vs/17/release/vc_redist.x64.exe'
  );
  process.exit(1);
}

for (const dll of DLLS) {
  copyFileSync(join(source, dll), join(binDir, dll));
}

if (!postgresLoads()) {
  console.error(`[vcruntime] still failing after copying from ${source}`);
  process.exit(1);
}

console.log(`[vcruntime] copied VC++ runtime into the postgres bin directory from ${source}`);
