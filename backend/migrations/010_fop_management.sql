-- 010_fop_management.sql — the rest of the FOP back-office: banks, events, reminders.

ALTER TABLE kafalat_donations ADD COLUMN IF NOT EXISTS account_no TEXT;
CREATE INDEX IF NOT EXISTS kafalat_donations_bank_idx ON kafalat_donations (bank);
CREATE INDEX IF NOT EXISTS kafalat_donations_submitted_idx ON kafalat_donations (submitted_at DESC);

ALTER TABLE kafalat_sponsors ADD COLUMN IF NOT EXISTS reference TEXT;
ALTER TABLE kafalat_sponsors ADD COLUMN IF NOT EXISTS total_orphans INTEGER;

-- Event registrations (e.g. "THE PROPHETIC WAY FORWARD").
CREATE TABLE IF NOT EXISTS fop_event_registrations (
  id              BIGSERIAL PRIMARY KEY,
  external_id     INTEGER UNIQUE,
  event           TEXT        NOT NULL,
  full_name       TEXT        NOT NULL,
  phone           TEXT,
  email           TEXT,
  address         TEXT,
  heard_from      TEXT,
  persons         INTEGER     NOT NULL DEFAULT 1,
  payment_upload  TEXT,
  note            TEXT,
  status          TEXT,
  added_on        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- WhatsApp reminders sent to sponsors with pending kafalat.
CREATE TABLE IF NOT EXISTS kafalat_reminders (
  id            BIGSERIAL PRIMARY KEY,
  sponsor_code  TEXT,
  sponsor_name  TEXT,
  phone         TEXT,
  year          INTEGER NOT NULL,
  month         INTEGER NOT NULL,
  message       TEXT,
  sent_by       BIGINT REFERENCES users (id) ON DELETE SET NULL,
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kafalat_reminders_month_idx ON kafalat_reminders (year, month, sponsor_code);
