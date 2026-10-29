-- Remove the persistent article-content trigram index from existing installations.
-- Keep title/source indexes; content remains queryable without on-demand index creation.
SET LOCAL lock_timeout = '5s';
DROP INDEX IF EXISTS silver.idx_lo3rwang_galaxy_content_trgm;
