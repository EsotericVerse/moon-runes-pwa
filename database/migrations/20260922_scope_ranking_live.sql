CREATE OR REPLACE FUNCTION api.scope_ranking_page(
  p_scope_id text,
  p_ranking_type text DEFAULT 'all',
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 20
)
RETURNS TABLE(
  ranking_type text,
  term text,
  item_count bigint,
  rank_value numeric,
  ranking_key text,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, api, silver
AS $function$
DECLARE
  safe_page integer := greatest(coalesce(p_page, 1), 1);
  safe_size integer := least(greatest(coalesce(p_page_size, 20), 1), 100);
BEGIN
  IF p_scope_id IS NULL OR btrim(p_scope_id) = '' THEN
    RAISE EXCEPTION 'scope id is required' USING ERRCODE = '22023';
  END IF;

  IF coalesce(p_ranking_type, 'all') NOT IN ('all', 'theme', 'emotion', 'imagery', 'context', 'genre') THEN
    RAISE EXCEPTION 'unsupported ranking type' USING ERRCODE = '22023';
  END IF;

  IF auth.user_id() IS NULL OR NOT (
    api.has_scope_access(p_scope_id, ARRAY['scope_owner','scope_manager','global_admin']::text[])
    OR api.has_scope_access('admin', ARRAY['global_admin']::text[])
  ) THEN
    RAISE EXCEPTION 'scope statistics access denied' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH scoped_work_ids AS (
    SELECT registry.work_id
      FROM silver.work_registry AS registry
     WHERE registry.owner_scope = p_scope_id
    UNION
    SELECT affiliation.work_id
      FROM silver.work_scope_affiliations AS affiliation
     WHERE affiliation.scope_id = p_scope_id
       AND affiliation.statistics_included = true
  ),
  eligible_work_ids AS (
    SELECT DISTINCT scoped.work_id
      FROM scoped_work_ids AS scoped
     WHERE NOT EXISTS (
       SELECT 1
         FROM silver.work_scope_affiliations AS excluded
        WHERE excluded.scope_id = p_scope_id
          AND excluded.work_id = scoped.work_id
          AND excluded.statistics_included = false
     )
  ),
  scope_tags AS (
    SELECT DISTINCT eligible.work_id, tags.ranking_type, btrim(tags.term) AS term
      FROM eligible_work_ids AS eligible
      JOIN silver.work_semantics AS semantics USING (work_id)
      CROSS JOIN LATERAL (
        SELECT 'theme'::text AS ranking_type, unnest(semantics.theme_tags) AS term
         WHERE coalesce(p_ranking_type, 'all') IN ('all', 'theme')
        UNION ALL
        SELECT 'emotion'::text, unnest(semantics.emotion_tags)
         WHERE coalesce(p_ranking_type, 'all') IN ('all', 'emotion')
        UNION ALL
        SELECT 'imagery'::text, unnest(semantics.imagery_tags)
         WHERE coalesce(p_ranking_type, 'all') IN ('all', 'imagery')
        UNION ALL
        SELECT 'context'::text, unnest(semantics.context_tags)
         WHERE coalesce(p_ranking_type, 'all') IN ('all', 'context')
        UNION ALL
        SELECT 'genre'::text, unnest(semantics.genre_tags)
         WHERE coalesce(p_ranking_type, 'all') IN ('all', 'genre')
      ) AS tags
     WHERE tags.term IS NOT NULL
       AND btrim(tags.term) <> ''
  ),
  grouped AS (
    SELECT scope_tags.ranking_type,
           scope_tags.term,
           count(DISTINCT scope_tags.work_id)::bigint AS item_count
      FROM scope_tags
     GROUP BY scope_tags.ranking_type, scope_tags.term
  ),
  counted AS (
    SELECT grouped.ranking_type,
           grouped.term,
           grouped.item_count,
           grouped.item_count::numeric AS rank_value,
           grouped.ranking_type || ':' || grouped.term AS ranking_key,
           count(*) OVER ()::bigint AS total_count
      FROM grouped
  )
  SELECT counted.ranking_type,
         counted.term,
         counted.item_count,
         counted.rank_value,
         counted.ranking_key,
         counted.total_count
    FROM counted
   ORDER BY counted.item_count DESC, counted.ranking_type, counted.term
   LIMIT safe_size
  OFFSET (safe_page - 1) * safe_size;
END;
$function$;

REVOKE ALL ON FUNCTION api.scope_ranking_page(text, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION api.scope_ranking_page(text, text, integer, integer) TO authenticated;
