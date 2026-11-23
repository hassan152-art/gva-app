-- Profile photo stored as Cloudious / Drive URL (see POST /profile/avatar).

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;
