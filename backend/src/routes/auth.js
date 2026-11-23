import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query, queryOne } from '../db/index.js';
import { signToken, requireAuth, asyncRoute } from '../lib/auth.js';
import { userDto } from '../lib/dto.js';

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRegistration({ fullName, email, phone, password }) {
  const errors = {};
  if (!fullName || fullName.trim().length < 2) errors.fullName = 'Enter your full name';
  if (!email || !EMAIL_RE.test(email.trim())) errors.email = 'Enter a valid email address';
  if (!phone || phone.replace(/\D/g, '').length < 10) errors.phone = 'Enter a valid phone number';
  if (!password || password.length < 8 || !/\d/.test(password)) {
    errors.password = 'At least 8 characters, with a number';
  }
  return errors;
}

/** POST /auth/register */
router.post(
  '/register',
  asyncRoute(async (req, res) => {
    const { fullName, email, phone, password } = req.body || {};
    const errors = validateRegistration({ fullName, email, phone, password });
    if (Object.keys(errors).length) {
      return res.status(422).json({ error: 'Please check the details you entered', errors });
    }

    const normalised = email.trim().toLowerCase();
    const existing = await queryOne('SELECT id FROM users WHERE email = $1', [normalised]);
    if (existing) {
      return res.status(409).json({ error: 'An account with that email already exists' });
    }

    const hash = await bcrypt.hash(password, 10);
    const row = await queryOne(
      `INSERT INTO users (full_name, email, phone, password_hash, role, avatar_initial)
       VALUES ($1,$2,$3,$4,'sponsor',$5) RETURNING *`,
      [fullName.trim(), normalised, phone.trim(), hash, fullName.trim().charAt(0).toUpperCase()]
    );

    res.status(201).json({ token: signToken(row), user: userDto(row) });
  })
);

/** POST /auth/login */
router.post(
  '/login',
  asyncRoute(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(422).json({ error: 'Email and password are required' });
    }
    const row = await queryOne('SELECT * FROM users WHERE email = $1', [String(email).trim().toLowerCase()]);
    // Same message for unknown email and wrong password — do not leak which.
    if (!row || !(await bcrypt.compare(password, row.password_hash))) {
      return res.status(401).json({ error: 'Incorrect email or password' });
    }
    res.json({ token: signToken(row), user: userDto(row) });
  })
);

/** GET /auth/me */
router.get(
  '/me',
  requireAuth,
  asyncRoute(async (req, res) => {
    const row = await queryOne('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (!row) return res.status(404).json({ error: 'Account not found' });
    res.json({ user: userDto(row) });
  })
);

/** POST /auth/change-password */
router.post(
  '/change-password',
  requireAuth,
  asyncRoute(async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(422).json({ error: 'Current and new password are required' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(422).json({ error: 'The new passwords do not match' });
    }
    if (newPassword.length < 8 || !/\d/.test(newPassword)) {
      return res.status(422).json({ error: 'At least 8 characters, with a number' });
    }

    const row = await queryOne('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (!row) return res.status(404).json({ error: 'Account not found' });
    if (!(await bcrypt.compare(currentPassword, row.password_hash))) {
      return res.status(401).json({ error: 'Your current password is incorrect' });
    }
    if (await bcrypt.compare(newPassword, row.password_hash)) {
      return res.status(422).json({ error: 'Choose a password you have not used before' });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
    res.json({ ok: true, message: 'Password updated' });
  })
);

/** POST /auth/forgot-password — acknowledged without revealing account existence. */
router.post(
  '/forgot-password',
  asyncRoute(async (req, res) => {
    const { email } = req.body || {};
    if (!email || !EMAIL_RE.test(String(email).trim())) {
      return res.status(422).json({ error: 'Enter a valid email address' });
    }
    // Deliberately uniform: no account enumeration. Email delivery is out of
    // scope for this build — wire a mail provider where this comment is.
    res.json({ ok: true, message: 'If that email is registered, a reset link is on its way.' });
  })
);

export default router;
