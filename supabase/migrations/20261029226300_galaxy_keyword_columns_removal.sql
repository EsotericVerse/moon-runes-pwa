-- Galaxy can be analyzed by many independent Keyword Classes.
-- A single Galaxy.class_id/group_lists would overwrite one Class with another.
-- The Group/Item UID lists in the six-column Keywords tree are the only output.
-- NO backfill, NO reclassification, NO data changes to Galaxy articles.
--
-- Must run AFTER deploying the UID-tree readers and retiring the legacy
-- api.apply_keyword_classification / silver.read_rune66_summary functions.
-- This migration is intentionally gated: no silent CASCADE.
DO $migration$
DECLARE
  scope_name text;
  missing_functions text[];
  old_function text;
BEGIN
  SELECT array_agg(fn) INTO missing_functions
  FROM unnest(ARRAY[
    'api.apply_keyword_classification(text,jsonb)',
    'silver.apply_keyword_classification(text,jsonb)',
    'silver.read_rune66_summary(text,date,date)'
  ]) AS fn
  WHERE to_regprocedure(fn) IS NOT NULL;
  IF cardinality(missing_functions)>0 THEN
    RAISE EXCEPTION 'Old Galaxy keyword RPCs must be retired before dropping columns: %',
      missing_functions;
  END IF;

  FOR scope_name IN SELECT unnest(ARRAY['lo3rwang','lrunes']) LOOP
    IF to_regclass(format('silver.%I_keywords',scope_name)) IS NULL THEN
      RAISE EXCEPTION 'Missing UID-tree Keywords table for %',scope_name;
    END IF;
    IF NOT EXISTS(
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='silver' AND table_name=scope_name||'_keywords'
        AND column_name='uid_lists'
    ) THEN
      RAISE EXCEPTION 'Keywords uid_lists is not installed for %',scope_name;
    END IF;
    EXECUTE format(
      'ALTER TABLE silver.%I_galaxy DROP COLUMN IF EXISTS class_id, DROP COLUMN IF EXISTS group_lists',
      scope_name
    );
  END LOOP;
END
$migration$;
NOTIFY pgrst, 'reload schema';
