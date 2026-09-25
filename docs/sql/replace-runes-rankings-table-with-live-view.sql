-- Replace the persisted JSON-era rune ranking snapshot with a live SQL view
-- calculated from the canonical relational silver.lrunes_style table.
BEGIN;

DO $$
DECLARE
  keyword_terms integer;
  rune_groups integer;
BEGIN
  SELECT count(*) INTO keyword_terms
  FROM (
    SELECT DISTINCT trim(term) AS term
    FROM silver.lrunes_style
    CROSS JOIN LATERAL regexp_split_to_table(
      coalesce(positive_keywords,'') || '、' || coalesce(negative_keywords,''),
      '[、，,[:space:]]+'
    ) AS term
    WHERE trim(term) <> ''
  ) AS terms;

  SELECT count(DISTINCT group_name) INTO rune_groups
  FROM silver.lrunes_style;

  IF keyword_terms <> 442 OR rune_groups <> 9 THEN
    RAISE EXCEPTION 'Unexpected canonical rune-style data: % keyword terms, % groups',
      keyword_terms, rune_groups;
  END IF;
END $$;

DROP VIEW IF EXISTS api.loc_rankings;
DROP VIEW IF EXISTS api.runes_rankings;
DROP VIEW IF EXISTS api.lo3rwang_rankings;
DROP TABLE IF EXISTS silver.runes_rankings;
DROP TABLE IF EXISTS silver.lo3rwang_rankings;

CREATE VIEW api.runes_rankings AS
WITH keyword_counts AS (
  SELECT trim(term) AS term, count(*)::bigint AS item_count
  FROM silver.lrunes_style
  CROSS JOIN LATERAL regexp_split_to_table(
    coalesce(positive_keywords,'') || '、' || coalesce(negative_keywords,''),
    '[、，,[:space:]]+'
  ) AS term
  WHERE trim(term) <> ''
  GROUP BY trim(term)
),
group_counts AS (
  SELECT group_name AS term, count(*)::bigint AS item_count
  FROM silver.lrunes_style
  GROUP BY group_name
)
SELECT 'keyword:' || term AS ranking_key,
       'keyword'::text AS ranking_type,
       term,
       item_count::numeric AS rank_value,
       item_count,
       NULL::timestamptz AS updated_at,
       'silver.lrunes_style'::text AS source
FROM keyword_counts
UNION ALL
SELECT 'group:' || term AS ranking_key,
       'group'::text AS ranking_type,
       term,
       item_count::numeric AS rank_value,
       item_count,
       NULL::timestamptz AS updated_at,
       'silver.lrunes_style'::text AS source
FROM group_counts;

CREATE VIEW api.lo3rwang_rankings AS
WITH period_ranges AS (
  SELECT period,
         start_date::date AS start_date,
         CASE WHEN end_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN end_date::date END AS end_date
  FROM silver.lo3rwang_period_context_entries
  WHERE context_type='period'
    AND start_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
), source_items AS (
  SELECT source_platform,
         (created_at AT TIME ZONE 'Asia/Taipei')::date AS work_date,
         updated_at
  FROM silver.lo3rwang_galaxy
  WHERE scope_id='lo3rwang' AND created_at IS NOT NULL
  UNION ALL
  SELECT source_platform,
         COALESCE((created_at AT TIME ZONE 'Asia/Taipei')::date,created_date) AS work_date,
         updated_at
  FROM silver.lo3rwang_galaxy_media
  WHERE scope_id='lo3rwang'
), grouped AS (
  SELECT p.period,
         w.source_platform AS term,
         count(*)::bigint AS item_count,
         max(w.updated_at) AS updated_at
  FROM period_ranges p
  JOIN source_items w
    ON w.work_date>=p.start_date
   AND w.work_date<=COALESCE(p.end_date,current_date)
  WHERE nullif(btrim(w.source_platform),'') IS NOT NULL
  GROUP BY p.period,w.source_platform
), ranked AS (
  SELECT grouped.*,
         sum(item_count) OVER (PARTITION BY period) AS period_count
  FROM grouped
)
SELECT 'period-source:'||period||':'||term AS ranking_key,
       'period_source'::text AS ranking_type,
       term,
       item_count::numeric AS rank_value,
       item_count,
       updated_at,
       period,
       item_count AS hit_count,
       round(100.0*item_count/nullif(period_count,0),2) AS percent
FROM ranked;

CREATE VIEW api.loc_rankings AS
SELECT 'runes'::text AS scope_id,
       ranking_key, ranking_type, term, rank_value, item_count, updated_at,
       NULL::text AS period, NULL::bigint AS hit_count, NULL::numeric AS percent, source
FROM api.runes_rankings
UNION ALL
SELECT 'lo3rwang'::text AS scope_id,
       ranking_key, ranking_type, term, rank_value, item_count, updated_at,
       period, hit_count, percent, NULL::text AS source
FROM api.lo3rwang_rankings;

GRANT SELECT ON api.runes_rankings, api.lo3rwang_rankings, api.loc_rankings TO anonymous, authenticated;

COMMIT;
