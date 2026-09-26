-- Aggregate current-period culture work counts by source without returning work rows.
-- Work details remain read through api.lo3rwang_galaxy with limit/offset paging.
CREATE OR REPLACE FUNCTION api.lo3rwang_period_work_source_counts(
  p_start_date date,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE(source_platform text, item_count bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog
AS $function$
  SELECT BTRIM(g.source_platform) AS source_platform,
         COUNT(*)::bigint AS item_count
  FROM api.lo3rwang_galaxy AS g
  WHERE p_start_date IS NOT NULL
    AND NULLIF(BTRIM(g.source_platform), '') IS NOT NULL
    AND g.created_at >= (p_start_date::timestamp AT TIME ZONE 'Asia/Taipei')
    AND (p_end_date IS NULL OR
         g.created_at < ((p_end_date + 1)::timestamp AT TIME ZONE 'Asia/Taipei'))
  GROUP BY 1
  ORDER BY COUNT(*) DESC, 1;
$function$;
REVOKE ALL ON FUNCTION api.lo3rwang_period_work_source_counts(date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION api.lo3rwang_period_work_source_counts(date, date) TO anonymous, authenticated;


-- Count galaxy_media records independently from galaxy works. Each row counts once,
-- even when multiple records have the same title or metadata text.
CREATE OR REPLACE FUNCTION api.lo3rwang_period_media_count(
  p_start_date date,
  p_end_date date DEFAULT NULL
)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog
AS $function$
  SELECT COUNT(*)::bigint
  FROM silver.lo3rwang_galaxy_media AS m
  WHERE p_start_date IS NOT NULL
    AND m.scope_id = 'lo3rwang'
    AND COALESCE(m.created_date, (m.created_at AT TIME ZONE 'Asia/Taipei')::date) >= p_start_date
    AND (p_end_date IS NULL OR
         COALESCE(m.created_date, (m.created_at AT TIME ZONE 'Asia/Taipei')::date) <= p_end_date);
$function$;
REVOKE ALL ON FUNCTION api.lo3rwang_period_media_count(date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION api.lo3rwang_period_media_count(date, date) TO anonymous, authenticated;

-- Return a bounded page of metadata fields only; media assets, URLs, and bodies are never read.
-- No DISTINCT is used so repeated titles/tags remain separate galaxy_media records.
CREATE OR REPLACE FUNCTION api.lo3rwang_period_media_metadata_page(
  p_start_date date,
  p_end_date date DEFAULT NULL,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(media_id uuid, media_date date, media_type text, source_platform text, title text, meta_tags text, style_tags text)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog
AS $function$
  SELECT m.media_id,
         COALESCE(m.created_date, (m.created_at AT TIME ZONE 'Asia/Taipei')::date) AS media_date,
         m.media_type,
         m.source_platform,
         m.title,
         m.meta_tags,
         m.style_tags
  FROM silver.lo3rwang_galaxy_media AS m
  WHERE p_start_date IS NOT NULL
    AND m.scope_id = 'lo3rwang'
    AND COALESCE(m.created_date, (m.created_at AT TIME ZONE 'Asia/Taipei')::date) >= p_start_date
    AND (p_end_date IS NULL OR
         COALESCE(m.created_date, (m.created_at AT TIME ZONE 'Asia/Taipei')::date) <= p_end_date)
  ORDER BY media_date DESC NULLS LAST, m.created_at DESC NULLS LAST, m.media_id
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 20), 100))
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$function$;
REVOKE ALL ON FUNCTION api.lo3rwang_period_media_metadata_page(date, date, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION api.lo3rwang_period_media_metadata_page(date, date, integer, integer) TO anonymous, authenticated;
