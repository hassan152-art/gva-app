-- Distinguish orphan vs student records in Organization admin.

ALTER TABLE orphans ADD COLUMN IF NOT EXISTS record_kind TEXT NOT NULL DEFAULT 'orphan';

ALTER TABLE orphans DROP CONSTRAINT IF EXISTS orphans_record_kind_check;
ALTER TABLE orphans ADD CONSTRAINT orphans_record_kind_check
  CHECK (record_kind IN ('orphan', 'student'));

CREATE INDEX IF NOT EXISTS orphans_record_kind_idx ON orphans (record_kind);
