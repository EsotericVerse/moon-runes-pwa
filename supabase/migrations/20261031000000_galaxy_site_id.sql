-- Preserve original social-post IDs independently of LOC Galaxy UID relations.
ALTER TABLE silver.lo3rwang_galaxy ADD COLUMN IF NOT EXISTS site_id text;
ALTER TABLE silver.lrunes_galaxy ADD COLUMN IF NOT EXISTS site_id text;
