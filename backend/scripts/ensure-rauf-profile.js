/**
 * Upsert rauf@appick.com and demo orphan OR711 for the profile form.
 *   node scripts/ensure-rauf-profile.js
 */
import bcrypt from 'bcryptjs';
import { pool } from '../src/db/index.js';
import { upsertWebDemoUser, WEB_DEMO_USER } from '../src/db/web-demo-user.js';

const ORPHAN = {
  code: 'OR711',
  name_ar: 'أحمد صلاح الدين نمر زغرة',
  name_en: 'Ahmad Salah Iddin Nimr Zaghra',
  orphan_id_number: '435790779',
  guardian_name_ar: 'ريهام توفيق إبراهيم زغرة',
  guardian_name_en: 'Reham Tawfeq Ibrahem Zaghra',
  guardian_id_number: '802486480',
  location: 'غزة .. الشيخ رضوان.. تحت الجسر',
  date_of_birth: '2015-08-03',
  whatsapp: '970 599 262 303',
  monthly_amount_pkr: 0,
};

async function upsertOrphanProfile(client) {
  const existing = await client.query('SELECT id FROM orphans WHERE code = $1', [ORPHAN.code]);
  let orphanId;
  if (existing.rows.length) {
    orphanId = existing.rows[0].id;
    await client.query(
      `UPDATE orphans SET
         name_ar = $1, name_en = $2, orphan_id_number = $3,
         guardian_name_ar = $4, guardian_name_en = $5, guardian_id_number = $6,
         location = $7, date_of_birth = $8, whatsapp = $9, monthly_amount_pkr = $10,
         first_name = $11, last_name = $12, status = 'waiting'
       WHERE id = $13`,
      [
        ORPHAN.name_ar,
        ORPHAN.name_en,
        ORPHAN.orphan_id_number,
        ORPHAN.guardian_name_ar,
        ORPHAN.guardian_name_en,
        ORPHAN.guardian_id_number,
        ORPHAN.location,
        ORPHAN.date_of_birth,
        ORPHAN.whatsapp,
        ORPHAN.monthly_amount_pkr,
        'Ahmad',
        'Zaghra',
        orphanId,
      ],
    );
  } else {
    const inserted = await client.query(
      `INSERT INTO orphans (
         code, name_ar, name_en, orphan_id_number,
         guardian_name_ar, guardian_name_en, guardian_id_number,
         location, date_of_birth, whatsapp, monthly_amount_pkr,
         first_name, last_name, age, sex, city, status
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       RETURNING id`,
      [
        ORPHAN.code,
        ORPHAN.name_ar,
        ORPHAN.name_en,
        ORPHAN.orphan_id_number,
        ORPHAN.guardian_name_ar,
        ORPHAN.guardian_name_en,
        ORPHAN.guardian_id_number,
        ORPHAN.location,
        ORPHAN.date_of_birth,
        ORPHAN.whatsapp,
        ORPHAN.monthly_amount_pkr,
        'Ahmad',
        'Zaghra',
        11,
        'Male',
        'Gaza',
        'waiting',
      ],
    );
    orphanId = inserted.rows[0].id;
  }
  return orphanId;
}

const client = await pool.connect();
try {
  await client.query('BEGIN');
  const userResult = await upsertWebDemoUser(client, bcrypt);
  const orphanId = await upsertOrphanProfile(client);
  await client.query('UPDATE users SET profile_orphan_id = $1 WHERE email = $2', [
    orphanId,
    WEB_DEMO_USER.email,
  ]);
  await client.query('COMMIT');
  console.log(`[rauf-profile] user ${userResult}`, WEB_DEMO_USER.email, '/', WEB_DEMO_USER.password);
  console.log(`[rauf-profile] orphan linked`, ORPHAN.code, 'id=', orphanId);
} catch (err) {
  await client.query('ROLLBACK');
  throw err;
} finally {
  client.release();
  await pool.end();
}
