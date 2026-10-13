-- One-time finalization after migration time-style-description-text-20261008.
-- All human-authored legacy JSONB entries must be present in style_description.
-- No CASCADE: abort if any external dependent object is discovered.
DO $guard$
DECLARE
  v_table text;
  v_missing bigint;
BEGIN
  FOREACH v_table IN ARRAY ARRAY['lo3rwang_time','lrunes_time'] LOOP
    EXECUTE format($check$
      SELECT count(*)
      FROM silver.%I AS t
      CROSS JOIN LATERAL jsonb_each_text(t.style_tag_descriptions) AS p(key,value)
      WHERE nullif(btrim(p.value),'') IS NOT NULL
        AND position(p.value IN coalesce(t.style_description,''))=0
    $check$,v_table) INTO v_missing;
    IF v_missing<>0 THEN
      RAISE EXCEPTION 'Refusing to drop legacy JSONB on %. Missing % human-authored description entries.',v_table,v_missing;
    END IF;
  END LOOP;
END;
$guard$;

ALTER TABLE silver.lo3rwang_time DROP COLUMN IF EXISTS style_tag_descriptions;
ALTER TABLE silver.lrunes_time DROP COLUMN IF EXISTS style_tag_descriptions;

-- Current canonical Time model remains style_tags TEXT, style_description TEXT
-- and referenced anchor_ids TEXT[]; no stored JSONB style metadata.
