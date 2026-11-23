-- Files attached to orphan/student records (Cloudious URLs).

CREATE TABLE IF NOT EXISTS orphan_documents (
  id BIGSERIAL PRIMARY KEY,
  orphan_id BIGINT NOT NULL REFERENCES orphans (id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  original_name TEXT,
  mimetype TEXT,
  size BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orphan_documents_orphan_idx ON orphan_documents (orphan_id);
