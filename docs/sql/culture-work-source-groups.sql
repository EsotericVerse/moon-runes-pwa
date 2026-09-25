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
  SELECT COALESCE(NULLIF(BTRIM(g.source_platform), ''), '未標示來源') AS source_platform,
         COUNT(*)::bigint AS item_count
  FROM api.lo3rwang_galaxy AS g
  WHERE p_start_date IS NOT NULL
    AND g.created_at >= (p_start_date::timestamp AT TIME ZONE 'Asia/Taipei')
    AND (p_end_date IS NULL OR
         g.created_at < ((p_end_date + 1)::timestamp AT TIME ZONE 'Asia/Taipei'))
  GROUP BY 1
  ORDER BY COUNT(*) DESC, 1;
$function$;
REVOKE ALL ON FUNCTION api.lo3rwang_period_work_source_counts(date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION api.lo3rwang_period_work_source_counts(date, date) TO anonymous, authenticated;
