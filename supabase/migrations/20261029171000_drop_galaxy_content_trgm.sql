-- Full-text substring search remains available on demand via the existing
-- content ILIKE queries; it does not require retaining this large GIN index.
-- Keep the migration idempotent for installations where it was already dropped.
DROP INDEX IF EXISTS silver.idx_lo3rwang_galaxy_content_trgm;
