/**
 * Loads the partner list from the FOP back-office (Profiles → Organizations).
 * Safe to re-run: a row with the same name + phone is not added twice.
 *   node scripts/seed-fop-organizations.js
 */
import { pool } from '../src/db/index.js';

const ORGS = [
  ['Website', 'organization', null],
  ['FOP', 'individual', '+201028592662'],
  ['FOP', 'individual', '+923159186060'],
  ['FOP', 'organization', '+923334460395'],
  ['FOP', 'individual', null],
  ['changes', 'organization', '+923275594429'],
  ['MAF', 'organization', '+447440072548'],
  ['FFP', 'organization', '+923002225354'],
  ['Imran Awan', 'individual', '+966552000139'],
  ['Bait Ul Aqba', 'organization', '+923343175741'],
];

let added = 0;
for (const [name, type, phone] of ORGS) {
  const exists = await pool.query(
    'SELECT 1 FROM organizations WHERE name = $1 AND phone IS NOT DISTINCT FROM $2',
    [name, phone],
  );
  if (exists.rowCount) continue;
  await pool.query('INSERT INTO organizations (name, org_type, phone) VALUES ($1, $2, $3)', [name, type, phone]);
  added += 1;
}
console.log(`[orgs] ${added} added, ${ORGS.length - added} already present`);
await pool.end();
