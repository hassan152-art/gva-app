import { Router } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { randomBytes } from 'node:crypto';
import { extname } from 'node:path';
import { query, queryOne } from '../db/index.js';
import { requireAuth, asyncRoute } from '../lib/auth.js';
import { requireAdmin } from '../lib/requireAdmin.js';
import { orphanProfileDto } from '../lib/orphanProfileDto.js';
import { PROOF_UPLOAD_EXTENSIONS } from '../constants/cloudious.js';
import { uploadToCloudious } from '../services/cloudiousUploadService.js';

const router = Router();
router.use(requireAuth, requireAdmin);

const PHOTO_EXT = new Set(['.png', '.jpg', '.jpeg']);
const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (PHOTO_EXT.has(extname(file.originalname).toLowerCase())) return cb(null, true);
    cb(new Error('Upload a JPG or PNG file (up to 5MB)'));
  },
});

const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Number(process.env.MAX_UPLOAD_MB || 5) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (PROOF_UPLOAD_EXTENSIONS.has(extname(file.originalname).toLowerCase())) return cb(null, true);
    cb(new Error('Upload a PNG, JPG, WEBP or PDF file'));
  },
});

function orphanDocumentDto(row) {
  return {
    id: String(row.id),
    fileUrl: row.file_url,
    originalName: row.original_name || null,
    mimetype: row.mimetype || null,
    size: row.size != null ? Number(row.size) : null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sponsorRow(r) {
  return {
    id: String(r.id),
    fullName: r.full_name,
    email: r.email,
    phone: r.phone,
    role: r.role,
    createdAt: r.created_at,
  };
}

function organizationRow(r) {
  return {
    id: String(r.id),
    name: r.name,
    type: r.org_type || 'organization',
    code: r.code,
    email: r.email,
    phone: r.phone,
    address: r.address,
    website: r.website,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

async function sponsorsForOrganization(orgId) {
  const rows = await query(
    `SELECT u.id, u.full_name, u.email, u.phone, u.role, u.created_at
       FROM organization_sponsors os
       JOIN users u ON u.id = os.user_id
      WHERE os.organization_id = $1
      ORDER BY u.full_name`,
    [orgId],
  );
  return rows.map(sponsorRow);
}

async function replaceOrganizationSponsors(orgId, sponsorUserIds) {
  await query('DELETE FROM organization_sponsors WHERE organization_id = $1', [orgId]);
  const ids = Array.isArray(sponsorUserIds)
    ? [...new Set(sponsorUserIds.map((id) => Number.parseInt(String(id), 10)).filter(Boolean))]
    : [];
  for (const userId of ids) {
    await queryOne(
      `INSERT INTO organization_sponsors (organization_id, user_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [orgId, userId],
    );
  }
}

/** GET /admin/sponsors/:id */
router.get(
  '/sponsors/:id',
  asyncRoute(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    const row = await queryOne(
      'SELECT id, full_name, email, phone, role, created_at FROM users WHERE id = $1',
      [id],
    );
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json({ sponsor: sponsorRow(row) });
  }),
);

/** GET /admin/sponsors?q= */
router.get(
  '/sponsors',
  asyncRoute(async (req, res) => {
    const q = String(req.query.q || '').trim();
    const like = q ? `%${q.replace(/[%_]/g, '')}%` : null;
    const rows = await query(
      `SELECT id, full_name, email, phone, role, created_at
         FROM users
        WHERE role IN ('sponsor', 'admin')
          AND ($1::text IS NULL OR full_name ILIKE $1 OR email ILIKE $1)
        ORDER BY full_name
        LIMIT 200`,
      [like],
    );
    res.json({ sponsors: rows.map(sponsorRow) });
  }),
);

/** POST /admin/sponsors */
router.post(
  '/sponsors',
  asyncRoute(async (req, res) => {
    const { fullName, email, phone, role = 'sponsor' } = req.body || {};
    if (!fullName || String(fullName).trim().length < 2) {
      return res.status(422).json({ error: 'Enter the sponsor’s full name' });
    }
    const normalised = String(email || '')
      .trim()
      .toLowerCase();
    if (!EMAIL_RE.test(normalised)) {
      return res.status(422).json({ error: 'Enter a valid email address' });
    }
    const nextRole = role === 'admin' ? 'admin' : 'sponsor';
    const existing = await queryOne('SELECT id FROM users WHERE email = $1', [normalised]);
    if (existing) return res.status(409).json({ error: 'Email already in use' });

    const tempPassword = `Gva!${randomBytes(4).toString('hex')}9`;
    const hash = await bcrypt.hash(tempPassword, 10);
    const name = String(fullName).trim();
    const row = await queryOne(
      `INSERT INTO users (full_name, email, phone, password_hash, role, avatar_initial)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, full_name, email, phone, role, created_at`,
      [name, normalised, phone ? String(phone).trim() : null, hash, nextRole, name.charAt(0).toUpperCase()],
    );
    res.status(201).json({ sponsor: sponsorRow(row), tempPassword, message: 'Sponsor created' });
  }),
);

/** PATCH /admin/sponsors/:id */
router.patch(
  '/sponsors/:id',
  asyncRoute(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    const current = await queryOne('SELECT * FROM users WHERE id = $1', [id]);
    if (!current) return res.status(404).json({ error: 'Not found' });

    const { fullName, email, phone } = req.body || {};
    const name = fullName !== undefined ? String(fullName).trim() : current.full_name;
    const normalised =
      email !== undefined ? String(email).trim().toLowerCase() : current.email;
    if (email !== undefined && !EMAIL_RE.test(normalised)) {
      return res.status(422).json({ error: 'Enter a valid email address' });
    }
    if (email !== undefined && normalised !== current.email) {
      const clash = await queryOne('SELECT id FROM users WHERE email = $1 AND id <> $2', [
        normalised,
        id,
      ]);
      if (clash) return res.status(409).json({ error: 'Email already in use' });
    }

    const row = await queryOne(
      `UPDATE users SET full_name = $1, email = $2, phone = $3, avatar_initial = $4
       WHERE id = $5 RETURNING id, full_name, email, phone, role, created_at`,
      [name, normalised, phone !== undefined ? String(phone).trim() : current.phone, name.charAt(0).toUpperCase(), id],
    );
    res.json({ sponsor: sponsorRow(row), message: 'Sponsor updated' });
  }),
);

/** DELETE /admin/sponsors/:id */
router.delete(
  '/sponsors/:id',
  asyncRoute(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (id === req.user.id) {
      return res.status(422).json({ error: 'You cannot delete your own account' });
    }
    const row = await queryOne('SELECT id, role FROM users WHERE id = $1', [id]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    await query("UPDATE sponsorships SET status = 'ended', ended_at = now() WHERE user_id = $1 AND status = 'active'", [id]);
    await query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ ok: true, message: 'Sponsor removed' });
  }),
);

async function orphanWithSponsor(row, rosterMap = null) {
  const sponsor = await queryOne(
    `SELECT u.* FROM sponsorships s JOIN users u ON u.id = s.user_id
      WHERE s.orphan_id = $1 AND s.status = 'active' LIMIT 1`,
    [row.id],
  );
  const dto = orphanProfileDto(row, sponsor);
  const roster = !row.roster_sponsor_code
    ? null
    : rosterMap
      ? rosterMap.get(row.roster_sponsor_code) || null
      : await queryOne('SELECT code, name, phone FROM kafalat_sponsors WHERE code = $1', [row.roster_sponsor_code]);
  dto.rosterSponsor = row.roster_sponsor_code
    ? { code: row.roster_sponsor_code, name: roster?.name || row.roster_sponsor_code, phone: roster?.phone || null }
    : null;
  return dto;
}

/** GET /admin/orphan-codes — code → id for every child (bulk photo upload by file name). */
router.get(
  '/orphan-codes',
  asyncRoute(async (_req, res) => {
    const rows = await query('SELECT id, code, record_kind FROM orphans WHERE code IS NOT NULL');
    res.json({ codes: rows.map((r) => ({ id: String(r.id), code: r.code, kind: r.record_kind })) });
  }),
);

/** GET /admin/orphans/:id */
router.get(
  '/orphans/:id',
  asyncRoute(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    const row = await queryOne('SELECT * FROM orphans WHERE id = $1', [id]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json({ orphan: await orphanWithSponsor(row) });
  }),
);

/** POST /admin/orphans/:id/photo */
router.post(
  '/orphans/:id/photo',
  photoUpload.single('file'),
  asyncRoute(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!req.file?.buffer?.length) {
      return res.status(422).json({ error: 'Choose a JPG or PNG photo (up to 5MB)' });
    }
    const row = await queryOne('SELECT id FROM orphans WHERE id = $1', [id]);
    if (!row) return res.status(404).json({ error: 'Not found' });

    const uploaded = await uploadToCloudious({
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
    });
    const updated = await queryOne('UPDATE orphans SET photo_url = $1 WHERE id = $2 RETURNING *', [
      uploaded.path,
      id,
    ]);
    res.json({ orphan: await orphanWithSponsor(updated), message: 'Photo updated' });
  }),
);

/** DELETE /admin/orphans/:id/photo */
router.delete(
  '/orphans/:id/photo',
  asyncRoute(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    const row = await queryOne('SELECT id FROM orphans WHERE id = $1', [id]);
    if (!row) return res.status(404).json({ error: 'Not found' });

    const updated = await queryOne('UPDATE orphans SET photo_url = NULL WHERE id = $1 RETURNING *', [
      id,
    ]);
    res.json({ orphan: await orphanWithSponsor(updated), message: 'Photo removed' });
  }),
);

/** GET /admin/orphans/:id/documents */
router.get(
  '/orphans/:id/documents',
  asyncRoute(async (req, res) => {
    const orphanId = Number.parseInt(req.params.id, 10);
    const row = await queryOne('SELECT id FROM orphans WHERE id = $1', [orphanId]);
    if (!row) return res.status(404).json({ error: 'Not found' });

    const rows = await query(
      `SELECT * FROM orphan_documents
        WHERE orphan_id = $1
        ORDER BY created_at DESC, id DESC`,
      [orphanId],
    );
    res.json({ documents: rows.map(orphanDocumentDto) });
  }),
);

/** POST /admin/orphans/:id/documents */
router.post(
  '/orphans/:id/documents',
  documentUpload.single('file'),
  asyncRoute(async (req, res) => {
    const orphanId = Number.parseInt(req.params.id, 10);
    if (!req.file?.buffer?.length) {
      return res.status(422).json({ error: 'Choose a PNG, JPG, WEBP or PDF file (up to 5MB)' });
    }
    const row = await queryOne('SELECT id FROM orphans WHERE id = $1', [orphanId]);
    if (!row) return res.status(404).json({ error: 'Not found' });

    const uploaded = await uploadToCloudious({
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
    });
    const doc = await queryOne(
      `INSERT INTO orphan_documents (orphan_id, file_url, original_name, mimetype, size)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        orphanId,
        uploaded.path,
        uploaded.originalname || req.file.originalname,
        uploaded.mimetype || req.file.mimetype,
        uploaded.size ?? req.file.size,
      ],
    );
    res.status(201).json({ document: orphanDocumentDto(doc), message: 'Document uploaded' });
  }),
);

/** DELETE /admin/orphans/:id/documents/:docId */
router.delete(
  '/orphans/:id/documents/:docId',
  asyncRoute(async (req, res) => {
    const orphanId = Number.parseInt(req.params.id, 10);
    const docId = Number.parseInt(req.params.docId, 10);
    const row = await queryOne(
      'SELECT id FROM orphan_documents WHERE id = $1 AND orphan_id = $2',
      [docId, orphanId],
    );
    if (!row) return res.status(404).json({ error: 'Not found' });

    await query('DELETE FROM orphan_documents WHERE id = $1', [docId]);
    res.json({ ok: true, message: 'Document removed' });
  }),
);

/**
 * GET /admin/orphans?kind=orphan|student&status=&q=&page=1&pageSize=25
 * Paginated: returns { orphans, total, page, pageSize, pages }.
 * Sponsors for the page are loaded in two queries (no per-row lookups).
 */
router.get(
  '/orphans',
  asyncRoute(async (req, res) => {
    const kind = req.query.kind === 'student' ? 'student' : 'orphan';
    const status = req.query.status === 'waiting' || req.query.status === 'sponsored' ? req.query.status : null;
    const q = String(req.query.q || '').trim();
    const like = q ? `%${q.replace(/[%_]/g, '')}%` : null;
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(String(req.query.pageSize || 25), 10) || 25));
    const page = Math.max(1, Number.parseInt(String(req.query.page || 1), 10) || 1);

    const where = `WHERE record_kind = $1
          AND ($2::text IS NULL OR status = $2)
          AND ($3::text IS NULL OR code ILIKE $3 OR name_en ILIKE $3 OR name_ar ILIKE $3 OR orphan_id_number ILIKE $3
               OR roster_sponsor_code ILIKE $3)`;
    const [{ total }] = await query(`SELECT count(*)::int AS total FROM orphans ${where}`, [kind, status, like]);
    const rows = await query(
      `SELECT * FROM orphans ${where}
        ORDER BY regexp_replace(code, '\\d', '', 'g') NULLS LAST,
                 NULLIF(regexp_replace(code, '\\D', '', 'g'), '')::int NULLS LAST, code, id DESC
        LIMIT $4 OFFSET $5`,
      [kind, status, like, pageSize, (page - 1) * pageSize],
    );
    const ids = rows.map((r) => r.id);
    const codes = [...new Set(rows.map((r) => r.roster_sponsor_code).filter(Boolean))];
    const [rosterRows, appRows] = await Promise.all([
      codes.length ? query('SELECT code, name, phone FROM kafalat_sponsors WHERE code = ANY($1::text[])', [codes]) : [],
      ids.length
        ? query(
            `SELECT DISTINCT ON (s.orphan_id) s.orphan_id, u.* FROM sponsorships s JOIN users u ON u.id = s.user_id
              WHERE s.orphan_id = ANY($1::bigint[]) AND s.status = 'active' ORDER BY s.orphan_id, s.started_at DESC`,
            [ids],
          )
        : [],
    ]);
    const rosterMap = new Map(rosterRows.map((s) => [s.code, s]));
    const appMap = new Map(appRows.map((u) => [String(u.orphan_id), u]));
    const orphans = rows.map((r) => {
      const dto = orphanProfileDto(r, appMap.get(String(r.id)) || null);
      const roster = r.roster_sponsor_code ? rosterMap.get(r.roster_sponsor_code) : null;
      dto.rosterSponsor = r.roster_sponsor_code
        ? { code: r.roster_sponsor_code, name: roster?.name || r.roster_sponsor_code, phone: roster?.phone || null }
        : null;
      return dto;
    });
    res.json({ orphans, total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) });
  }),
);

/** POST /admin/orphans */
router.post(
  '/orphans',
  asyncRoute(async (req, res) => {
    const body = req.body || {};
    const kind = body.recordKind === 'student' ? 'student' : 'orphan';
    const code = String(body.code || '').trim();
    if (!code) return res.status(422).json({ error: 'Code is required' });

    const clash = await queryOne('SELECT id FROM orphans WHERE code = $1', [code]);
    if (clash) return res.status(409).json({ error: 'Code already exists' });

    const monthly = Number.parseInt(String(body.monthlyAmountPkr ?? 0), 10) || 0;
    const initialStatus =
      body.status === 'sponsored' || body.status === 'waiting' ? body.status : 'waiting';
    const sex =
      body.sex === 'Female' || body.sex === 'Male' ? body.sex : body.sex?.trim() || null;
    const row = await queryOne(
      `INSERT INTO orphans (
         code, record_kind, name_ar, name_en, orphan_id_number,
         guardian_name_ar, guardian_name_en, guardian_id_number,
         location, date_of_birth, whatsapp, monthly_amount_pkr,
         first_name, last_name, status, sex
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING *`,
      [
        code,
        kind,
        body.nameAr?.trim() || null,
        body.nameEn?.trim() || null,
        body.orphanIdNumber?.trim() || null,
        body.guardianNameAr?.trim() || null,
        body.guardianNameEn?.trim() || null,
        body.guardianIdNumber?.trim() || null,
        body.location?.trim() || null,
        body.dateOfBirth || null,
        body.whatsapp?.trim() || null,
        monthly,
        body.nameEn?.split(' ')[0] || code,
        body.nameEn?.split(' ').slice(1).join(' ') || '',
        initialStatus,
        sex,
      ],
    );
    const rosterCode = String(body.rosterSponsorCode || '').trim();
    if (rosterCode) {
      const sp = await queryOne('SELECT code FROM kafalat_sponsors WHERE upper(code) = upper($1)', [rosterCode]);
      if (sp) await query("UPDATE orphans SET roster_sponsor_code = $1, status = 'sponsored' WHERE id = $2", [sp.code, row.id]);
    }
    const created = await queryOne('SELECT * FROM orphans WHERE id = $1', [row.id]);
    res.status(201).json({ orphan: await orphanWithSponsor(created), message: 'Record created' });
  }),
);

/** PATCH /admin/orphans/:id */
router.patch(
  '/orphans/:id',
  asyncRoute(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    const current = await queryOne('SELECT * FROM orphans WHERE id = $1', [id]);
    if (!current) return res.status(404).json({ error: 'Not found' });

    const body = req.body || {};
    const monthly =
      body.monthlyAmountPkr !== undefined
        ? Number.parseInt(String(body.monthlyAmountPkr), 10) || 0
        : current.monthly_amount_pkr;

    const row = await queryOne(
      `UPDATE orphans SET
         code = COALESCE($1, code),
         name_ar = COALESCE($2, name_ar),
         name_en = COALESCE($3, name_en),
         orphan_id_number = COALESCE($4, orphan_id_number),
         guardian_name_ar = COALESCE($5, guardian_name_ar),
         guardian_name_en = COALESCE($6, guardian_name_en),
         guardian_id_number = COALESCE($7, guardian_id_number),
         location = COALESCE($8, location),
         date_of_birth = COALESCE($9, date_of_birth),
         whatsapp = COALESCE($10, whatsapp),
         monthly_amount_pkr = $11,
         status = COALESCE($12, status),
         record_kind = COALESCE($13, record_kind),
         sex = COALESCE($14, sex)
       WHERE id = $15 RETURNING *`,
      [
        body.code?.trim() || null,
        body.nameAr?.trim() ?? null,
        body.nameEn?.trim() ?? null,
        body.orphanIdNumber?.trim() ?? null,
        body.guardianNameAr?.trim() ?? null,
        body.guardianNameEn?.trim() ?? null,
        body.guardianIdNumber?.trim() ?? null,
        body.location?.trim() ?? null,
        body.dateOfBirth || null,
        body.whatsapp?.trim() ?? null,
        monthly,
        body.status || null,
        body.recordKind || null,
        body.sex === 'Female' || body.sex === 'Male' ? body.sex : null,
        id,
      ],
    );

    if (body.rosterSponsorCode !== undefined) {
      const code = String(body.rosterSponsorCode || '').trim();
      if (code) {
        const sp = await queryOne('SELECT code FROM kafalat_sponsors WHERE upper(code) = upper($1)', [code]);
        if (!sp) return res.status(404).json({ error: `Sponsor ${code} not found` });
        await query("UPDATE orphans SET roster_sponsor_code = $1, status = 'sponsored' WHERE id = $2", [sp.code, id]);
      } else {
        await query("UPDATE orphans SET roster_sponsor_code = NULL, status = 'waiting' WHERE id = $1", [id]);
      }
    }

    if (body.sponsorUserId !== undefined) {
      const sponsorId =
        body.sponsorUserId === null || body.sponsorUserId === ''
          ? null
          : Number.parseInt(String(body.sponsorUserId), 10);
      await query(
        `UPDATE sponsorships SET status = 'ended', ended_at = now() WHERE orphan_id = $1 AND status = 'active'`,
        [id],
      );
      if (sponsorId) {
        await queryOne(
          `INSERT INTO sponsorships (user_id, orphan_id, monthly_amount_pkr, status) VALUES ($1,$2,$3,'active')`,
          [sponsorId, id, monthly > 0 ? monthly : 30000],
        );
        await queryOne("UPDATE orphans SET status = 'sponsored' WHERE id = $1", [id]);
      } else {
        await queryOne("UPDATE orphans SET status = 'waiting' WHERE id = $1", [id]);
      }
    }

    const fresh = await queryOne('SELECT * FROM orphans WHERE id = $1', [id]);
    res.json({ orphan: await orphanWithSponsor(fresh), message: 'Record updated' });
  }),
);

/** DELETE /admin/orphans/:id */
router.delete(
  '/orphans/:id',
  asyncRoute(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    const row = await queryOne('SELECT id FROM orphans WHERE id = $1', [id]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    await query('DELETE FROM orphans WHERE id = $1', [id]);
    res.json({ ok: true, message: 'Record deleted' });
  }),
);

/** GET /admin/organizations?q= */
router.get(
  '/organizations',
  asyncRoute(async (req, res) => {
    const q = String(req.query.q || '').trim();
    const like = q ? `%${q.replace(/[%_]/g, '')}%` : null;
    const rows = await query(
      `SELECT o.*,
              (SELECT COUNT(*)::int FROM organization_sponsors os WHERE os.organization_id = o.id) AS sponsor_count,
              (SELECT COUNT(*)::int FROM orphans x
                WHERE lower(trim(x.partner_org)) = lower(trim(o.name))) AS orphan_count
         FROM organizations o
        WHERE ($1::text IS NULL OR o.name ILIKE $1 OR o.code ILIKE $1 OR o.email ILIKE $1
               OR o.phone ILIKE $1 OR o.address ILIKE $1 OR o.org_type ILIKE $1)
        ORDER BY o.id
        LIMIT 500`,
      [like],
    );
    res.json({
      organizations: rows.map((r) => ({
        ...organizationRow(r),
        sponsorCount: r.sponsor_count ?? 0,
        orphanCount: r.orphan_count ?? 0,
      })),
    });
  }),
);

/** GET /admin/organizations/:id */
router.get(
  '/organizations/:id',
  asyncRoute(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    const row = await queryOne('SELECT * FROM organizations WHERE id = $1', [id]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    const sponsors = await sponsorsForOrganization(id);
    res.json({ organization: organizationRow(row), sponsors });
  }),
);

/** POST /admin/organizations */
router.post(
  '/organizations',
  asyncRoute(async (req, res) => {
    const body = req.body || {};
    const name = String(body.name || '').trim();
    if (name.length < 2) return res.status(422).json({ error: 'Enter the organization name' });
    const code = body.code ? String(body.code).trim() : null;
    if (code) {
      const clash = await queryOne('SELECT id FROM organizations WHERE code = $1', [code]);
      if (clash) return res.status(409).json({ error: 'Code already exists' });
    }
    const row = await queryOne(
      `INSERT INTO organizations (name, code, email, phone, address, website, notes, org_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        name,
        code,
        body.email?.trim() || null,
        body.phone?.trim() || null,
        body.address?.trim() || null,
        body.website?.trim() || null,
        body.notes?.trim() || null,
        body.type === 'individual' ? 'individual' : 'organization',
      ],
    );
    if (body.sponsorUserIds !== undefined) {
      await replaceOrganizationSponsors(row.id, body.sponsorUserIds);
    }
    const sponsors = await sponsorsForOrganization(row.id);
    res.status(201).json({ organization: organizationRow(row), sponsors, message: 'Organization created' });
  }),
);

/** PATCH /admin/organizations/:id */
router.patch(
  '/organizations/:id',
  asyncRoute(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    const current = await queryOne('SELECT * FROM organizations WHERE id = $1', [id]);
    if (!current) return res.status(404).json({ error: 'Not found' });

    const body = req.body || {};
    const name = body.name !== undefined ? String(body.name).trim() : current.name;
    if (name.length < 2) return res.status(422).json({ error: 'Enter the organization name' });

    let code = body.code !== undefined ? (body.code ? String(body.code).trim() : null) : current.code;
    if (code && code !== current.code) {
      const clash = await queryOne('SELECT id FROM organizations WHERE code = $1 AND id <> $2', [
        code,
        id,
      ]);
      if (clash) return res.status(409).json({ error: 'Code already exists' });
    }

    const row = await queryOne(
      `UPDATE organizations SET
         name = $1, code = $2, email = $3, phone = $4, address = $5, website = $6, notes = $7,
         org_type = $9, updated_at = now()
       WHERE id = $8 RETURNING *`,
      [
        name,
        code,
        body.email !== undefined ? body.email?.trim() || null : current.email,
        body.phone !== undefined ? body.phone?.trim() || null : current.phone,
        body.address !== undefined ? body.address?.trim() || null : current.address,
        body.website !== undefined ? body.website?.trim() || null : current.website,
        body.notes !== undefined ? body.notes?.trim() || null : current.notes,
        id,
        body.type === 'individual' || body.type === 'organization' ? body.type : current.org_type,
      ],
    );

    if (body.sponsorUserIds !== undefined) {
      await replaceOrganizationSponsors(id, body.sponsorUserIds);
    }

    const sponsors = await sponsorsForOrganization(id);
    res.json({ organization: organizationRow(row), sponsors, message: 'Organization updated' });
  }),
);

/** DELETE /admin/organizations/:id */
router.delete(
  '/organizations/:id',
  asyncRoute(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    const row = await queryOne('SELECT id FROM organizations WHERE id = $1', [id]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    await query('DELETE FROM organizations WHERE id = $1', [id]);
    res.json({ ok: true, message: 'Organization removed' });
  }),
);

export default router;
