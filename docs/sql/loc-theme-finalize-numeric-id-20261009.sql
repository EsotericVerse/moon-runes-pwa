-- Phase 2 (run after deploying typed-column Theme readers and editor):
-- remove the obsolete JSONB payload; store Theme PK as a plain smallint 1..8.
-- Existing Scope configuration tables keep their own Theme selections.
DO $check$
BEGIN
  IF (SELECT count(*) FROM silver.loc_theme) <> 8 THEN
    RAISE EXCEPTION 'Expected eight saved Themes before ID conversion';
  END IF;
  IF EXISTS(
    SELECT 1 FROM silver.loc_theme
    WHERE theme_id !~ '^theme-[1-8]$'
       OR theme_order <> split_part(theme_id,'-',2)::integer
  ) THEN
    RAISE EXCEPTION 'Old theme_id is not a reversible 1..8 identity';
  END IF;
END;
$check$;
ALTER TABLE silver.loc_theme DROP CONSTRAINT loc_theme_id_check;
ALTER TABLE silver.loc_theme
  ALTER COLUMN theme_id TYPE smallint
  USING split_part(theme_id,'-',2)::smallint;
ALTER TABLE silver.loc_theme
  ADD CONSTRAINT loc_theme_id_check CHECK (theme_id BETWEEN 1 AND 8);
ALTER TABLE silver.loc_theme DROP COLUMN theme_attr;
-- There is deliberately no theme_group column: theme_name owns the label.
