-- Partner organizations (NGOs, schools) and linked sponsor accounts.

CREATE TABLE IF NOT EXISTS organizations (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT        NOT NULL,
  code        TEXT        UNIQUE,
  email       TEXT,
  phone       TEXT,
  address     TEXT,
  website     TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS organizations_name_idx ON organizations (name);

CREATE TABLE IF NOT EXISTS organization_sponsors (
  organization_id BIGINT NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  user_id         BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS organization_sponsors_user_idx ON organization_sponsors (user_id);
