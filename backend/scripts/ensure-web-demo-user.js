/**
 * Upsert the web login demo user without running a full seed.
 *   node scripts/ensure-web-demo-user.js
 */
import bcrypt from 'bcryptjs';
import { pool } from '../src/db/index.js';
import { upsertWebDemoUser, WEB_DEMO_USER } from '../src/db/web-demo-user.js';

const result = await upsertWebDemoUser(pool, bcrypt);
console.log(`[web-demo] ${result}`, WEB_DEMO_USER.email, '/', WEB_DEMO_USER.password);
await pool.end();
