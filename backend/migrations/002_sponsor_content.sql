-- 002_sponsor_content.sql
--
-- Adds what the Sponsor tab needs, sourced from the live content API at
-- gazavirtualadoption.org:
--
--   * orphans carry the official published code (OR575) and poster image.
--     The live API only ever publishes a code and a poster JPEG — every other
--     field (name, age, description, tags) is null there — so those columns
--     become nullable rather than being filled with invented values.
--   * carousel_slides holds the hadith/motivational cards shown at the top of
--     the Sponsor tab.
--   * hadiths holds the standalone hadith collection.
--
-- The monthly sponsorship amount moves to PKR 30,000, which is the figure the
-- product now quotes, so it is the default on every amount column.

-- ---------------------------------------------------------------------------
-- Orphans: official code + poster, and nullable demographics
-- ---------------------------------------------------------------------------
ALTER TABLE orphans ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE orphans ADD COLUMN IF NOT EXISTS poster_url TEXT;
ALTER TABLE orphans ADD COLUMN IF NOT EXISTS external_id INTEGER;

-- The published data has no name, age, sex or city for most children: the API
-- exposes a code and a poster, and the child's name is rendered inside that
-- poster image. These columns therefore have to accept null rather than being
-- filled with invented values.
ALTER TABLE orphans ALTER COLUMN first_name DROP NOT NULL;
ALTER TABLE orphans ALTER COLUMN last_name DROP NOT NULL;
ALTER TABLE orphans ALTER COLUMN age DROP NOT NULL;
ALTER TABLE orphans ALTER COLUMN sex DROP NOT NULL;
ALTER TABLE orphans ALTER COLUMN city DROP NOT NULL;

-- Drop the constraints that mention the now-nullable demographic columns.
ALTER TABLE orphans DROP CONSTRAINT IF EXISTS orphans_age_check;
ALTER TABLE orphans DROP CONSTRAINT IF EXISTS orphans_sex_check;

CREATE UNIQUE INDEX IF NOT EXISTS orphans_code_uniq ON orphans (code) WHERE code IS NOT NULL;

-- PKR 30,000 is the sponsorship price now.
ALTER TABLE orphans ALTER COLUMN monthly_amount_pkr SET DEFAULT 30000;
ALTER TABLE sponsorships ALTER COLUMN monthly_amount_pkr SET DEFAULT 30000;

-- ---------------------------------------------------------------------------
-- Carousel slides (top of the Sponsor tab): hadith + motivational cards.
-- Managed content, so sort_order drives the rotation.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS carousel_slides (
  id           BIGSERIAL PRIMARY KEY,
  kind         TEXT        NOT NULL DEFAULT 'hadith'
               CHECK (kind IN ('hadith', 'story', 'program')),
  tag          TEXT,
  title        TEXT,
  body         TEXT        NOT NULL,
  arabic       TEXT,
  reference    TEXT,
  image_url    TEXT,
  sort_order   INTEGER     NOT NULL DEFAULT 0,
  is_active    BOOLEAN     NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS carousel_slides_order_idx
  ON carousel_slides (is_active, sort_order);

-- ---------------------------------------------------------------------------
-- The standalone hadith collection (homepage "Virtues of Caring for Orphans").
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hadiths (
  id           BIGSERIAL PRIMARY KEY,
  heading      TEXT,
  arabic       TEXT        NOT NULL,
  translation  TEXT        NOT NULL,
  reference    TEXT        NOT NULL,
  sort_order   INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
