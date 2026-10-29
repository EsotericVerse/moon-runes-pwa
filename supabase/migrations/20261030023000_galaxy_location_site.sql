-- The content-source field is site; the check-in text field is location.
-- Rename in place, retaining every Galaxy/media row, index, and permission.
-- This migration runs after all historical source_place/source_name migrations.
ALTER TABLE silver.lo3rwang_galaxy RENAME COLUMN source_place TO location;
ALTER TABLE silver.lo3rwang_galaxy RENAME COLUMN source_name TO site;
ALTER TABLE silver.lrunes_galaxy RENAME COLUMN source_place TO location;
ALTER TABLE silver.lrunes_galaxy RENAME COLUMN source_name TO site;
ALTER TABLE silver.lo3rwang_galaxy_media RENAME COLUMN source_place TO location;
ALTER TABLE silver.lrunes_galaxy_media RENAME COLUMN source_place TO location;

-- Existing PL/pgSQL RPCs store field names in dynamic SQL. Refresh those
-- function bodies without changing their security or Scope checks.
DO $migration$
DECLARE
  current_fn record;
  replacement text;
BEGIN
  FOR current_fn IN
    SELECT p.oid,p.proname,pg_get_function_identity_arguments(p.oid) arglist,
      pg_get_functiondef(p.oid) definition
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='silver' AND p.prokind='f'
      AND (p.prosrc ILIKE '%source_place%' OR p.prosrc ILIKE '%source_name%'
        OR p.proname IN ('rename_scope_source_name_batch','batch_fill_galaxy_source_place'))
    ORDER BY p.proname
  LOOP
    replacement:=replace(replace(current_fn.definition,'source_place','location'),'source_name','site');
    IF current_fn.proname='find_galaxy_duplicates' THEN
      -- Its named OUT column also changes from source_name to site.
      -- No SQL dependents exist; recreate using the original security clauses.
      EXECUTE format('DROP FUNCTION silver.%I(%s)',current_fn.proname,current_fn.arglist);
    ELSIF current_fn.proname='rename_scope_source_name_batch' THEN
      EXECUTE format('ALTER FUNCTION silver.%I(%s) RENAME TO rename_scope_site_batch',
        current_fn.proname,current_fn.arglist);
    ELSIF current_fn.proname='batch_fill_galaxy_source_place' THEN
      EXECUTE format('ALTER FUNCTION silver.%I(%s) RENAME TO batch_fill_galaxy_location',
        current_fn.proname,current_fn.arglist);
    END IF;
    EXECUTE replacement;
  END LOOP;
END $migration$;

ALTER INDEX IF EXISTS silver.idx_lo3rwang_galaxy_source_name RENAME TO idx_lo3rwang_galaxy_site;
ALTER INDEX IF EXISTS silver.idx_lo3rwang_galaxy_source_name_trgm RENAME TO idx_lo3rwang_galaxy_site_trgm;
ALTER INDEX IF EXISTS silver.idx_lo3rwang_galaxy_source_place_trgm RENAME TO idx_lo3rwang_galaxy_location_trgm;
ALTER INDEX IF EXISTS silver.idx_lrunes_galaxy_source_place_trgm RENAME TO idx_lrunes_galaxy_location_trgm;
ALTER INDEX IF EXISTS silver.lrunes_galaxy_source_name_idx RENAME TO lrunes_galaxy_site_idx;

DO $verify$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM information_schema.columns
   WHERE table_schema='silver' AND column_name IN ('location','site')
    AND table_name IN ('lo3rwang_galaxy','lrunes_galaxy',
        'lo3rwang_galaxy_media','lrunes_galaxy_media');
  IF n<>6 THEN RAISE EXCEPTION 'Expected 6 renamed columns, found %',n; END IF;
END $verify$;
NOTIFY pgrst,'reload schema';
