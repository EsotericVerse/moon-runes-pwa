-- Preserve Galaxy search semantics and row-level security.
-- Maintain trigram indexes only for frequently searched title and source name.
-- Article content remains searchable on demand without a persistent GIN index.
-- No rows or policies are changed.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '90s';
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE INDEX IF NOT EXISTS idx_lo3rwang_galaxy_title_trgm
  ON silver.lo3rwang_galaxy USING gin (title extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_lo3rwang_galaxy_source_name_trgm
  ON silver.lo3rwang_galaxy USING gin (source_name extensions.gin_trgm_ops);
