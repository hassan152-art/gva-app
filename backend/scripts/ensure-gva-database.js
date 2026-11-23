/** Creates the application database if missing (normally done by start-db.js). */
import pg from 'pg';
import dotenv from 'dotenv';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
dotenv.config({ path: join(root, '.env'), quiet: true });

const port = Number(process.env.PGPORT || 5432);
const user = process.env.PGUSER || 'postgres';
const password = process.env.PGPASSWORD || 'postgres';
const database = process.env.PGDATABASE || 'gva';

const client = new pg.Client({
  host: '127.0.0.1',
  port,
  user,
  password,
  database: 'postgres',
});
await client.connect();
const { rows } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [database]);
if (rows.length === 0) {
  await client.query(`CREATE DATABASE "${database}"`);
  console.log(`[db] created database "${database}"`);
} else {
  console.log(`[db] database "${database}" already exists`);
}
await client.end();
