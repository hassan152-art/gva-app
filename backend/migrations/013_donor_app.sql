-- 013_donor_app.sql — mobile donor app: payment accounts, sponsorship /
-- payment requests with slips, and complaint tickets.
--
-- A donor's app login (users) is tied to their sponsor record
-- (kafalat_sponsors, SP601 …) through users.sponsor_code, so the app shows the
-- same children, invoices and ledger the admin sees.

ALTER TABLE users ADD COLUMN IF NOT EXISTS sponsor_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS users_sponsor_code_uniq ON users (sponsor_code) WHERE sponsor_code IS NOT NULL;

-- Where donors send money. Exactly one account is active at a time.
CREATE TABLE IF NOT EXISTS payment_accounts (
  id             BIGSERIAL PRIMARY KEY,
  label          TEXT        NOT NULL,              -- "JazzCash", "Faysal Bank"
  bank_name      TEXT,
  account_title  TEXT        NOT NULL,
  account_number TEXT        NOT NULL,
  iban           TEXT,
  branch         TEXT,
  instructions   TEXT,
  is_active      BOOLEAN     NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS payment_accounts_one_active
  ON payment_accounts ((true)) WHERE is_active;

-- A donor asks to sponsor a child (kind=sponsorship) or reports a monthly
-- payment for children they already sponsor (kind=payment). Admin approves
-- or rejects; approving links the child and records the money.
CREATE TABLE IF NOT EXISTS donor_requests (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  kind            TEXT        NOT NULL CHECK (kind IN ('sponsorship', 'payment')),
  orphan_ids      BIGINT[]    NOT NULL DEFAULT '{}',
  year            INTEGER     NOT NULL,
  months          INTEGER[]   NOT NULL DEFAULT '{}',
  amount_pkr      INTEGER     NOT NULL CHECK (amount_pkr >= 0),
  payment_account_id BIGINT   REFERENCES payment_accounts (id) ON DELETE SET NULL,
  account_snapshot TEXT,                            -- the account shown to the donor at that time
  slip_url        TEXT,
  note            TEXT,
  status          TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note      TEXT,
  decided_by      BIGINT REFERENCES users (id) ON DELETE SET NULL,
  decided_at      TIMESTAMPTZ,
  receipt_id      BIGINT REFERENCES kafalat_receipts (id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS donor_requests_status_idx ON donor_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS donor_requests_user_idx ON donor_requests (user_id, created_at DESC);

-- Complaint / support tickets with a message thread.
CREATE TABLE IF NOT EXISTS support_tickets (
  id          BIGSERIAL PRIMARY KEY,
  ticket_no   TEXT        NOT NULL UNIQUE,
  user_id     BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  category    TEXT        NOT NULL DEFAULT 'other',
  subject     TEXT        NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  orphan_id   BIGINT      REFERENCES orphans (id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS support_tickets_user_idx ON support_tickets (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON support_tickets (status, updated_at DESC);

CREATE TABLE IF NOT EXISTS ticket_messages (
  id             BIGSERIAL PRIMARY KEY,
  ticket_id      BIGINT      NOT NULL REFERENCES support_tickets (id) ON DELETE CASCADE,
  author_user_id BIGINT      REFERENCES users (id) ON DELETE SET NULL,
  author_role    TEXT        NOT NULL CHECK (author_role IN ('donor', 'admin')),
  body           TEXT        NOT NULL,
  attachment_url TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ticket_messages_ticket_idx ON ticket_messages (ticket_id, created_at);

CREATE SEQUENCE IF NOT EXISTS support_ticket_no_seq START 1001;
