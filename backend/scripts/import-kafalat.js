/**
 * Import FOP back-office exports into the local database.
 *
 *   node scripts/import-kafalat.js sponsors  path/to/Sponsors.csv
 *   node scripts/import-kafalat.js orphans   path/to/Orphans.csv
 *   node scripts/import-kafalat.js donations path/to/Submissions.csv
 *
 * Open the .xls export in Excel and "Save As → CSV UTF-8" first.
 * Import sponsors before orphans so the sponsor details are complete.
 */
import { readFile } from 'node:fs/promises';
import { pool } from '../src/db/index.js';
import { importDonations, importEvents, importOrphans, importSponsors, parseCsv } from '../src/services/kafalat.js';

const [type, file] = process.argv.slice(2);
const runners = { sponsors: importSponsors, orphans: importOrphans, donations: importDonations, events: importEvents };
if (!runners[type] || !file) {
  console.error('usage: node scripts/import-kafalat.js <sponsors|orphans|donations|events> <file.csv>');
  process.exit(1);
}
try {
  const rows = parseCsv(await readFile(file, 'utf8'));
  const result = await runners[type](rows);
  console.log(`[import] ${type}: ${rows.length} rows`, result);
} catch (err) {
  console.error('[import] failed:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
