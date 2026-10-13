-- Time style descriptions are first-class searchable TEXT, not JSON attrs.
-- Additive migration: preserve existing anchor_ids, period/event rows, and the
-- old JSONB source temporarily for safe rollback during website deployment.
ALTER TABLE silver.lo3rwang_time ADD COLUMN IF NOT EXISTS style_description text;
ALTER TABLE silver.lrunes_time ADD COLUMN IF NOT EXISTS style_description text;

-- Backfill existing human-authored descriptions without losing any entries.
-- A row with multiple style tags becomes one readable TEXT narrative, with
-- each original label marking the corresponding paragraph.
WITH legacy AS (
  SELECT t.record_id,
    CASE WHEN count(*)=1 THEN max(p.value)
      ELSE string_agg(p.key || '：' || p.value, E'\n\n' ORDER BY p.key)
    END AS description
  FROM silver.lo3rwang_time t
  CROSS JOIN LATERAL jsonb_each_text(t.style_tag_descriptions) AS p(key,value)
  WHERE nullif(btrim(p.value),'') IS NOT NULL
  GROUP BY t.record_id
)
UPDATE silver.lo3rwang_time t
SET style_description=legacy.description
FROM legacy
WHERE t.record_id=legacy.record_id
  AND nullif(btrim(t.style_description),'') IS NULL;

WITH legacy AS (
  SELECT t.record_id,
    CASE WHEN count(*)=1 THEN max(p.value)
      ELSE string_agg(p.key || '：' || p.value, E'\n\n' ORDER BY p.key)
    END AS description
  FROM silver.lrunes_time t
  CROSS JOIN LATERAL jsonb_each_text(t.style_tag_descriptions) AS p(key,value)
  WHERE nullif(btrim(p.value),'') IS NOT NULL
  GROUP BY t.record_id
)
UPDATE silver.lrunes_time t
SET style_description=legacy.description
FROM legacy
WHERE t.record_id=legacy.record_id
  AND nullif(btrim(t.style_description),'') IS NULL;

COMMENT ON COLUMN silver.lo3rwang_time.style_description IS 'Primary searchable human-authored style description (TEXT), associated with style_tags and existing anchor_ids';
COMMENT ON COLUMN silver.lrunes_time.style_description IS 'Primary searchable human-authored style description (TEXT), associated with style_tags and existing anchor_ids';
