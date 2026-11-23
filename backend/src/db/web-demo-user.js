/** Web frontend demo sign-in (also upserted by `npm run seed`). */
export const WEB_DEMO_USER = {
  fullName: 'Rauf',
  email: 'rauf@appick.com',
  password: 'rauf#123456',
  phone: '+92 300 0000001',
  initial: 'R',
  role: 'admin',
};

/** @param {import('pg').PoolClient | import('pg').Pool} db */
export async function upsertWebDemoUser(db, bcrypt) {
  const hash = await bcrypt.hash(WEB_DEMO_USER.password, 10);
  const existing = await db.query('SELECT id FROM users WHERE email = $1', [WEB_DEMO_USER.email]);
  if (existing.rows.length) {
    await db.query(
      `UPDATE users
       SET full_name = $1, phone = $2, password_hash = $3, role = $4, avatar_initial = $5
       WHERE email = $6`,
      [
        WEB_DEMO_USER.fullName,
        WEB_DEMO_USER.phone,
        hash,
        WEB_DEMO_USER.role,
        WEB_DEMO_USER.initial,
        WEB_DEMO_USER.email,
      ],
    );
    return 'updated';
  }
  await db.query(
    `INSERT INTO users (full_name, email, phone, password_hash, role, avatar_initial)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      WEB_DEMO_USER.fullName,
      WEB_DEMO_USER.email,
      WEB_DEMO_USER.phone,
      hash,
      WEB_DEMO_USER.role,
      WEB_DEMO_USER.initial,
    ],
  );
  return 'created';
}
