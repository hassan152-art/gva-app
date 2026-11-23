-- Orphan profile fields (Edspire-style profile form) + link from user account.

ALTER TABLE orphans ADD COLUMN IF NOT EXISTS name_ar TEXT;
ALTER TABLE orphans ADD COLUMN IF NOT EXISTS name_en TEXT;
ALTER TABLE orphans ADD COLUMN IF NOT EXISTS orphan_id_number TEXT;
ALTER TABLE orphans ADD COLUMN IF NOT EXISTS guardian_name_ar TEXT;
ALTER TABLE orphans ADD COLUMN IF NOT EXISTS guardian_name_en TEXT;
ALTER TABLE orphans ADD COLUMN IF NOT EXISTS guardian_id_number TEXT;
ALTER TABLE orphans ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE orphans ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE orphans ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE orphans ADD COLUMN IF NOT EXISTS photo_url TEXT;

ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_orphan_id BIGINT REFERENCES orphans (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS users_profile_orphan_idx ON users (profile_orphan_id);
