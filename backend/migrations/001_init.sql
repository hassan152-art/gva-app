-- 001_init.sql — Gaza Virtual Adoption core schema.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Users (sponsors / donors). Admins verify payment proofs.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id             BIGSERIAL PRIMARY KEY,
  full_name      TEXT        NOT NULL,
  email          TEXT        NOT NULL UNIQUE,
  phone          TEXT,
  password_hash  TEXT        NOT NULL,
  role           TEXT        NOT NULL DEFAULT 'sponsor' CHECK (role IN ('sponsor', 'admin')),
  avatar_initial TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Orphans. `status` follows the product: waiting -> sponsored.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orphans (
  id          BIGSERIAL PRIMARY KEY,
  first_name  TEXT        NOT NULL,
  last_name   TEXT        NOT NULL,
  age         INTEGER     NOT NULL CHECK (age >= 0),
  sex         TEXT        NOT NULL CHECK (sex IN ('Male', 'Female')),
  city        TEXT        NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'sponsored')),
  monthly_amount_pkr INTEGER NOT NULL DEFAULT 10000,
  bio         TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orphans_status_idx ON orphans (status);

-- A sponsor supporting a child monthly. One active row per (user, orphan).
CREATE TABLE IF NOT EXISTS sponsorships (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  orphan_id    BIGINT      NOT NULL REFERENCES orphans (id) ON DELETE CASCADE,
  monthly_amount_pkr INTEGER NOT NULL DEFAULT 10000,
  status       TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at     TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS sponsorships_active_uniq
  ON sponsorships (user_id, orphan_id) WHERE status = 'active';

-- ---------------------------------------------------------------------------
-- Monthly payment batches ("Your December batch 1 is open").
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS batches (
  id                 BIGSERIAL PRIMARY KEY,
  label              TEXT        NOT NULL,
  month_key          TEXT        NOT NULL,          -- e.g. 2026-12
  batch_no           INTEGER     NOT NULL DEFAULT 1,
  minimum_pkr        INTEGER     NOT NULL DEFAULT 30000,
  status             TEXT        NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  opens_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  closes_at          TIMESTAMPTZ,
  CONSTRAINT batches_month_batch_uniq UNIQUE (month_key, batch_no)
);

-- ---------------------------------------------------------------------------
-- Payments. `kind` mirrors the design's history row titles.
-- `status` = pending until an admin verifies the uploaded proof.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id             BIGSERIAL PRIMARY KEY,
  user_id        BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  batch_id       BIGINT      REFERENCES batches (id) ON DELETE SET NULL,
  kind           TEXT        NOT NULL DEFAULT 'monthly'
                 CHECK (kind IN ('monthly', 'campaign', 'one_time')),
  title          TEXT        NOT NULL,
  subtitle       TEXT,
  amount_pkr     INTEGER     NOT NULL CHECK (amount_pkr > 0),
  platform_fee_pkr INTEGER   NOT NULL DEFAULT 0,
  status         TEXT        NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'completed', 'rejected')),
  method         TEXT        NOT NULL DEFAULT 'bank_transfer'
                 CHECK (method IN ('bank_transfer', 'card', 'stripe')),
  reference_note TEXT,
  proof_path     TEXT,
  paid_on        DATE        NOT NULL DEFAULT CURRENT_DATE,
  verified_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payments_user_paid_on_idx ON payments (user_id, paid_on DESC);
CREATE INDEX IF NOT EXISTS payments_status_idx ON payments (status);

-- Which orphan(s) a payment covers (a monthly payment can cover several).
CREATE TABLE IF NOT EXISTS payment_allocations (
  id         BIGSERIAL PRIMARY KEY,
  payment_id BIGINT NOT NULL REFERENCES payments (id) ON DELETE CASCADE,
  orphan_id  BIGINT NOT NULL REFERENCES orphans (id) ON DELETE CASCADE,
  amount_pkr INTEGER NOT NULL CHECK (amount_pkr > 0)
);

CREATE INDEX IF NOT EXISTS payment_allocations_orphan_idx ON payment_allocations (orphan_id);
CREATE INDEX IF NOT EXISTS payment_allocations_payment_idx ON payment_allocations (payment_id);

-- Keep users.updated_at honest.
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_touch_updated_at ON users;
CREATE TRIGGER users_touch_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
