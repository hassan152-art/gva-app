import pg from 'pg';

async function main() {
  const local = new pg.Client({ host: '127.0.0.1', port: 5432, database: 'gva', user: 'postgres', password: 'postgres' });
  const remote = new pg.Client({ connectionString: 'postgresql://sa:D3JHBp9Na7Z5Sg87jDql@94.130.35.208:5489/gva', ssl: false });

  console.log('[sync] Connecting to local and remote databases...');
  await local.connect();
  await remote.connect();

  const tables = [
    'schema_migrations',
    'users',
    'organizations',
    'orphans',
    'orphan_documents',
    'sponsorships',
    'batches',
    'payments',
    'payment_allocations',
    'carousel_slides',
    'hadiths',
    'organization_sponsors',
    'kafalat_sponsors',
    'kafalat_donations',
    'kafalat_reminders',
    'fop_event_registrations',
  ];

  console.log('[sync] Disabling FK constraints on remote (replica mode)...');
  await remote.query("SET session_replication_role = 'replica'");

  for (const table of tables) {
    console.log(`[sync] Processing table: ${table}...`);
    const { rows } = await local.query(`SELECT * FROM "${table}"`);
    console.log(`  Read ${rows.length} rows from local.`);

    await remote.query(`TRUNCATE TABLE "${table}" CASCADE`);

    if (rows.length === 0) continue;

    const columns = Object.keys(rows[0]);
    const quotedCols = columns.map(c => `"${c}"`).join(', ');

    // Chunk size to avoid exceeding parameter limits
    const chunkSize = 200;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const values = [];
      const placeholders = [];

      chunk.forEach((row, rowIndex) => {
        const rowPlaceholders = columns.map((col, colIndex) => {
          values.push(row[col]);
          return `$${rowIndex * columns.length + colIndex + 1}`;
        });
        placeholders.push(`(${rowPlaceholders.join(', ')})`);
      });

      const query = `INSERT INTO "${table}" (${quotedCols}) VALUES ${placeholders.join(', ')}`;
      await remote.query(query, values);
    }
    console.log(`  ✓ Inserted ${rows.length} rows into remote "${table}".`);
  }

  console.log('[sync] Re-enabling FK constraints on remote...');
  await remote.query("SET session_replication_role = 'origin'");

  // Reset all sequences on remote
  console.log('[sync] Resetting auto-increment sequences on remote...');
  const seqRes = await remote.query(`
    SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public'
  `);
  for (const s of seqRes.rows) {
    const seq = s.sequence_name;
    // Derive table and column name: e.g. users_id_seq -> users.id
    const match = seq.match(/^(.+)_(.+)_seq$/);
    if (match) {
      const [, tbl, col] = match;
      try {
        await remote.query(`
          SELECT setval('${seq}', COALESCE((SELECT MAX("${col}") FROM "${tbl}"), 1), true)
        `);
      } catch (err) {
        // ignore if pattern doesn't match
      }
    }
  }

  console.log('[sync] Verifying remote database row counts:');
  for (const table of tables) {
    const countRes = await remote.query(`SELECT count(*) FROM "${table}"`);
    console.log(`  ${table}: ${countRes.rows[0].count} rows`);
  }

  await local.end();
  await remote.end();
  console.log('[sync] Sync completed successfully!');
}

main().catch((err) => {
  console.error('[sync] Error:', err);
  process.exit(1);
});
