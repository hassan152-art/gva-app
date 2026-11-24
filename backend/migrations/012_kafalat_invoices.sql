-- 012_kafalat_invoices.sql — Edspire-style receivables for kafalat.
--
-- Every month each sponsored child gets one invoice (receivable) addressed to
-- the sponsor: "OR015 · November 2026 · PKR 30,000". It starts unpaid. When the
-- sponsor pays, a receipt is recorded and split over that sponsor's unpaid
-- invoices; each split also becomes a kafalat_donations row, so the existing
-- tracker / report / reminder screens see the payment too.
--
-- An invoice's paid amount is always derived from kafalat_donations for that
-- child and month, so imported history and online-form submissions settle
-- invoices automatically.

CREATE TABLE IF NOT EXISTS kafalat_receipts (
  id            BIGSERIAL PRIMARY KEY,
  receipt_no    TEXT        NOT NULL UNIQUE,
  sponsor_code  TEXT,
  sponsor_name  TEXT        NOT NULL,
  sponsor_phone TEXT,
  amount_pkr    INTEGER     NOT NULL CHECK (amount_pkr > 0),
  received_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  method        TEXT        NOT NULL DEFAULT 'bank',   -- bank | cash | online | other
  bank          TEXT,
  reference     TEXT,
  attachment_urls TEXT,
  note          TEXT,
  received_by   BIGINT REFERENCES users (id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kafalat_receipts_sponsor_idx ON kafalat_receipts (sponsor_code, received_at DESC);

CREATE TABLE IF NOT EXISTS kafalat_invoices (
  id            BIGSERIAL PRIMARY KEY,
  invoice_no    TEXT        NOT NULL UNIQUE,
  orphan_id     BIGINT      NOT NULL REFERENCES orphans (id) ON DELETE CASCADE,
  sponsor_code  TEXT,
  year          INTEGER     NOT NULL,
  month         INTEGER     NOT NULL CHECK (month BETWEEN 1 AND 12),
  amount_pkr    INTEGER     NOT NULL CHECK (amount_pkr >= 0),
  discount_pkr  INTEGER     NOT NULL DEFAULT 0 CHECK (discount_pkr >= 0),
  due_date      DATE,
  note          TEXT,
  created_by    BIGINT REFERENCES users (id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (orphan_id, year, month)
);

CREATE INDEX IF NOT EXISTS kafalat_invoices_sponsor_idx ON kafalat_invoices (sponsor_code, year, month);
CREATE INDEX IF NOT EXISTS kafalat_invoices_period_idx ON kafalat_invoices (year, month);

-- Link the per-child donation rows back to the receipt they came from.
ALTER TABLE kafalat_donations ADD COLUMN IF NOT EXISTS receipt_id BIGINT REFERENCES kafalat_receipts (id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS kafalat_donations_receipt_idx ON kafalat_donations (receipt_id);

-- Public, unguessable token for the sponsor's invoice page (sent on WhatsApp).
ALTER TABLE kafalat_sponsors ADD COLUMN IF NOT EXISTS invoice_token TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS kafalat_sponsors_invoice_token_uniq
  ON kafalat_sponsors (invoice_token) WHERE invoice_token IS NOT NULL;

CREATE SEQUENCE IF NOT EXISTS kafalat_invoice_no_seq START 100001;
CREATE SEQUENCE IF NOT EXISTS kafalat_receipt_no_seq START 50001;
