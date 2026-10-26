-- Scope-local spatial anchor references; an intentional additive-only migration.
-- Actual Supabase migration: galaxy_scope_place_id_nullable_20261026
-- Do not backfill from source_place, truncate any trace.uid, or change galaxy.uid.
ALTER TABLE silver.lo3rwang_galaxy ADD COLUMN IF NOT EXISTS place_id varchar(4);
ALTER TABLE silver.lrunes_galaxy ADD COLUMN IF NOT EXISTS place_id varchar(4);

CREATE INDEX IF NOT EXISTS lo3rwang_galaxy_place_id_idx
  ON silver.lo3rwang_galaxy(place_id) WHERE place_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS lrunes_galaxy_place_id_idx
  ON silver.lrunes_galaxy(place_id) WHERE place_id IS NOT NULL;

COMMENT ON COLUMN silver.lo3rwang_galaxy.place_id IS
  'Nullable Scope-local reference to a spatial-anchor UID; never replace source_place; no guessed backfill.';
COMMENT ON COLUMN silver.lrunes_galaxy.place_id IS
  'Nullable Scope-local reference to a spatial-anchor UID; never replace source_place; no guessed backfill.';
