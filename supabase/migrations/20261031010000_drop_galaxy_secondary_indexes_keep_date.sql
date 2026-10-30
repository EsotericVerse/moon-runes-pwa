-- Galaxy holds tens of thousands of rows and site has only a handful of values.
-- Keep the primary key and the date index; drop every other secondary index.
DROP INDEX IF EXISTS silver.idx_lo3rwang_galaxy_site;
DROP INDEX IF EXISTS silver.idx_lo3rwang_galaxy_site_trgm;
DROP INDEX IF EXISTS silver.idx_lo3rwang_galaxy_location_trgm;
DROP INDEX IF EXISTS silver.idx_lo3rwang_galaxy_ref_id;
DROP INDEX IF EXISTS silver.idx_lo3rwang_galaxy_source_id;
DROP INDEX IF EXISTS silver.idx_lo3rwang_galaxy_target_id;
DROP INDEX IF EXISTS silver.lo3rwang_galaxy_place_id_idx;
DROP INDEX IF EXISTS silver.lrunes_galaxy_site_idx;
DROP INDEX IF EXISTS silver.idx_lrunes_galaxy_location_trgm;
DROP INDEX IF EXISTS silver.lrunes_galaxy_ref_id_idx;
DROP INDEX IF EXISTS silver.lrunes_galaxy_source_id_idx;
DROP INDEX IF EXISTS silver.lrunes_galaxy_target_id_idx;
DROP INDEX IF EXISTS silver.lrunes_galaxy_place_id_idx;
