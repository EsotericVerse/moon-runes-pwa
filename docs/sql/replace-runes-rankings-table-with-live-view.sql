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
DROP TABLE silver.runes_rankings;

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

CREATE VIEW api.loc_rankings AS
SELECT 'runes'::text AS scope_id,
       ranking_key, ranking_type, term, rank_value, item_count, updated_at,
       NULL::text AS period, NULL::bigint AS hit_count, NULL::numeric AS percent, source
FROM api.runes_rankings
UNION ALL
SELECT 'lo3rwang'::text AS scope_id,
       ranking_key, ranking_type, term, rank_value, item_count, updated_at,
       period, hit_count, percent, NULL::text AS source
FROM silver.lo3rwang_rankings;

GRANT SELECT ON api.runes_rankings, api.loc_rankings TO anonymous, authenticated;

COMMIT;
