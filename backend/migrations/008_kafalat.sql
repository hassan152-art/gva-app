-- 008_kafalat.sql — child profiles, sponsor roster and kafalat (donation) records.
--
-- The FOP back-office exports (Orphans / Sponsors) and the public form at
-- gazavirtualadoption.org/submit-kafalat are the sources:
--   * orphans gain the roster fields from the export (list, organization, external id)
--   * kafalat_sponsors holds the sponsor roster (SP601 …) without needing app logins
--   * kafalat_donations holds each submission: who paid, for which child,
--     which month(s), how much and when (date + time).

ALTER TABLE orphans ADD COLUMN IF NOT EXISTS list_name TEXT;
ALTER TABLE orphans ADD COLUMN IF NOT EXISTS partner_org TEXT;
ALTER TABLE orphans ADD COLUMN IF NOT EXISTS roster_external_id INTEGER;
ALTER TABLE orphans ADD COLUMN IF NOT EXISTS roster_sponsor_code TEXT;

CREATE INDEX IF NOT EXISTS orphans_roster_sponsor_idx ON orphans (roster_sponsor_code);

CREATE TABLE IF NOT EXISTS kafalat_sponsors (
  id           BIGSERIAL PRIMARY KEY,
  code         TEXT        NOT NULL UNIQUE,          -- SP601
  external_id  INTEGER,
  name         TEXT        NOT NULL,
  area         TEXT,
  phone        TEXT,
  email        TEXT,
  status       TEXT,
  added_on     TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kafalat_donations (
  id             BIGSERIAL PRIMARY KEY,
  orphan_id      BIGINT      REFERENCES orphans (id) ON DELETE SET NULL,
  orphan_code    TEXT,
  orphan_name    TEXT,
  sponsor_code   TEXT,
  sponsor_name   TEXT        NOT NULL,
  sponsor_phone  TEXT,
  year           INTEGER     NOT NULL,
  months         INTEGER[]   NOT NULL DEFAULT '{}',   -- 1..12
  amount_pkr     INTEGER     NOT NULL CHECK (amount_pkr >= 0),
  submitted_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  attachment_urls TEXT,
  note           TEXT,
  status         TEXT        NOT NULL DEFAULT 'received'
                 CHECK (status IN ('received', 'verified', 'rejected')),
  source         TEXT        NOT NULL DEFAULT 'manual'
                 CHECK (source IN ('manual', 'import', 'online_form')),
  external_ref   TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kafalat_donations_orphan_idx ON kafalat_donations (orphan_id, year);
CREATE INDEX IF NOT EXISTS kafalat_donations_code_idx ON kafalat_donations (orphan_code);
CREATE UNIQUE INDEX IF NOT EXISTS kafalat_donations_ext_uniq
  ON kafalat_donations (external_ref) WHERE external_ref IS NOT NULL;
