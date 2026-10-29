-- Historical installations may still carry a costly GIN title trigram index.
-- Keep title ILIKE search available; omit persistent trigram title indexing.
-- The original creation migration also omits this index for fresh installs.
SET LOCAL lock_timeout = '5s';
DROP INDEX IF EXISTS silver.idx_lo3rwang_galaxy_title_trgm;
