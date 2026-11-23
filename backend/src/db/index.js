import pg from 'pg';
import env from '../config.js';

const { Pool } = pg;

const base = env.databaseUrl
  ? { connectionString: env.databaseUrl }
  : {
      host: env.pg.host,
      port: env.pg.port,
      database: env.pg.database,
      user: env.pg.user,
      password: env.pg.password,
    };

const useSsl = env.pgssl
  ? { rejectUnauthorized: false }
  : (process.env.PGSSL === undefined && env.databaseUrl.includes('sslmode=require'))
    ? { rejectUnauthorized: false }
    : undefined;

export const pool = new Pool({
  ...base,
  ssl: useSsl,
  max: 10,
  idleTimeoutMillis: 30_000,
});

pool.on('error', (err) => {
  console.error('[db] idle client error', err.message);
});

/** Run a query and return the rows. */
export async function query(text, params) {
  const res = await pool.query(text, params);
  return res.rows;
}

/** Run a query and return the first row (or undefined). */
export async function queryOne(text, params) {
  const rows = await query(text, params);
  return rows[0];
}

/** Run a set of statements inside one transaction. */
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export default { pool, query, queryOne, withTransaction };
