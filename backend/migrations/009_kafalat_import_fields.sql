-- Extra detail kept from the FOP "OnlineTransfer Details" export.
ALTER TABLE kafalat_donations ADD COLUMN IF NOT EXISTS bank TEXT;
-- Orphan code exactly as the donor typed it ("OR 015 and OR 023").
ALTER TABLE kafalat_donations ADD COLUMN IF NOT EXISTS raw_code TEXT;
-- How many children shared one payment (amount is split evenly).
ALTER TABLE kafalat_donations ADD COLUMN IF NOT EXISTS split_count INTEGER NOT NULL DEFAULT 1;
