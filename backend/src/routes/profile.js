import { Router } from 'express';
import multer from 'multer';
import { extname } from 'node:path';
import { query, queryOne } from '../db/index.js';
import { requireAuth, asyncRoute } from '../lib/auth.js';
import { userDto, money } from '../lib/dto.js';
import { uploadToCloudious } from '../services/cloudiousUploadService.js';

const router = Router();

const AVATAR_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg']);
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (AVATAR_EXTENSIONS.has(extname(file.originalname).toLowerCase())) return cb(null, true);
    cb(new Error('Upload a JPG or PNG file (up to 5MB)'));
  },
});

/** GET /profile — the Profile tab: account details plus lifetime totals. */
router.get(
  '/',
  requireAuth,
  asyncRoute(async (req, res) => {
    const user = await queryOne('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'Account not found' });

    const [stats] = await query(
      `SELECT
         (SELECT count(*)::int FROM sponsorships WHERE user_id = $1 AND status = 'active')       AS sponsored,
         (SELECT COALESCE(sum(amount_pkr),0)::int FROM payments
            WHERE user_id = $1 AND status = 'completed')                                        AS given,
         (SELECT count(*)::int FROM payments WHERE user_id = $1 AND status = 'completed')        AS donations,
         (SELECT count(*)::int FROM payments WHERE user_id = $1 AND status = 'pending')          AS pending`,
      [req.user.id]
    );

    res.json({
      user: userDto(user),
      stats: {
        sponsored: stats.sponsored,
        totalGiven: money(stats.given),
        donations: stats.donations,
        pending: stats.pending,
      },
    });
  })
);

/** PATCH /profile — edit name, phone and email. The role can never be changed here. */
router.patch(
  '/',
  requireAuth,
  asyncRoute(async (req, res) => {
    const { fullName, phone, email } = req.body || {};
    const errors = {};
    if (fullName !== undefined && String(fullName).trim().length < 2) {
      errors.fullName = 'Enter your full name';
    }
    if (phone !== undefined && String(phone).replace(/\D/g, '').length < 10) {
      errors.phone = 'Enter a valid phone number';
    }
    if (email !== undefined) {
      const emailTrim = String(email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
        errors.email = 'Enter a valid email address';
      } else {
        const existing = await queryOne(
          'SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id <> $2',
          [emailTrim, req.user.id]
        );
        if (existing) {
          errors.email = 'An account with that email already exists';
        }
      }
    }
    if (Object.keys(errors).length) {
      return res.status(422).json({ error: 'Please check the details you entered', errors });
    }

    const current = await queryOne('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (!current) return res.status(404).json({ error: 'Account not found' });

    const nextName = fullName !== undefined ? String(fullName).trim() : current.full_name;
    const nextPhone = phone !== undefined ? String(phone).trim() : current.phone;
    const nextEmail = email !== undefined ? String(email).trim().toLowerCase() : current.email;
    const nextRole = current.role;

    const row = await queryOne(
      `UPDATE users
          SET full_name = $1,
              phone = $2,
              email = $3,
              role = $4,
              avatar_initial = $5,
              updated_at = now()
        WHERE id = $6
        RETURNING *`,
      [nextName, nextPhone, nextEmail, nextRole, nextName.charAt(0).toUpperCase(), req.user.id]
    );

    res.json({ user: userDto(row), message: 'Profile updated' });
  })
);

/** POST /profile/avatar — profile photo (memory → Cloudious, folder GVA-APP). */
router.post(
  '/avatar',
  requireAuth,
  avatarUpload.single('file'),
  asyncRoute(async (req, res) => {
    if (!req.file?.buffer?.length) {
      return res.status(422).json({ error: 'Choose a JPG or PNG photo (up to 5MB)' });
    }

    const uploaded = await uploadToCloudious({
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
    });

    const row = await queryOne(
      `UPDATE users SET avatar_url = $1 WHERE id = $2 RETURNING *`,
      [uploaded.path, req.user.id]
    );
    if (!row) return res.status(404).json({ error: 'Account not found' });

    res.json({ user: userDto(row), message: 'Profile photo updated' });
  })
);

export default router;
