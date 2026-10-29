-- Remove the persistent article-content trigram index from existing installations.
-- Title and content remain queryable without persistent trigram indexes; keep the separate source-name index.
SET LOCAL lock_timeout = '5s';
DROP INDEX IF EXISTS silver.idx_lo3rwang_galaxy_content_trgm;
