-- Preserves the existing Galaxy search semantics and row-level security.
-- Verified on the authoritative Supabase project using EXPLAIN (ANALYZE, BUFFERS):
--   title ILIKE, and (content ILIKE OR source_name ILIKE), and public
--   (title ILIKE OR content ILIKE) probes now use Bitmap Index Scan.
-- Migration version matches the already-applied production migration.
-- No rows or policies are changed.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '90s';
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE INDEX IF NOT EXISTS idx_lo3rwang_galaxy_title_trgm
  ON silver.lo3rwang_galaxy USING gin (title extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_lo3rwang_galaxy_content_trgm
  ON silver.lo3rwang_galaxy USING gin (content extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_lo3rwang_galaxy_source_name_trgm
  ON silver.lo3rwang_galaxy USING gin (source_name extensions.gin_trgm_ops);
