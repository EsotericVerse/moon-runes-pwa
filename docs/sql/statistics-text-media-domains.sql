-- Statistics domains: text and multimedia metadata.
-- Text statistics read silver.lo3rwang_galaxy only.
-- Multimedia Meta Tag statistics read silver.lo3rwang_galaxy_media only.
-- No multimedia keyword dictionary is introduced; media statistics use media_type/source_platform/style_tags directly.

CREATE OR REPLACE VIEW api.lo3rwang_rankings AS
WITH period_ranges AS (
  SELECT period,
         start_date::date AS start_date,
         CASE WHEN end_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN end_date::date ELSE NULL::date END AS end_date
  FROM silver.lo3rwang_period_context_entries
  WHERE context_type='period'
    AND start_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
),
text_base AS (
  SELECT g.source_platform,g.category,g.content_type,
         (g.created_at AT TIME ZONE 'Asia/Taipei')::date AS item_date,g.updated_at
  FROM silver.lo3rwang_galaxy g
  WHERE g.scope_id='lo3rwang'
    AND NOT EXISTS (
      SELECT 1 FROM silver.resource_visibility rv
      WHERE rv.scope=g.scope_id
        AND rv.resource_type='galaxy'
        AND rv.resource_id=g.galaxy_id
        AND rv.statistics_included IS FALSE
    )
),
media_base AS (
  SELECT m.media_id,m.source_platform,m.media_type,
         COALESCE(NULLIF(btrim(m.style_tags),''),'風格未知') AS style_tags,
         COALESCE((m.created_at AT TIME ZONE 'Asia/Taipei')::date,m.created_date) AS item_date,
         m.updated_at
  FROM silver.lo3rwang_galaxy_media m
  WHERE m.scope_id='lo3rwang'
    AND NOT EXISTS (
      SELECT 1 FROM silver.resource_visibility rv
      WHERE rv.scope=m.scope_id
        AND rv.resource_type='galaxy_media'
        AND rv.resource_id=m.media_id::text
        AND rv.statistics_included IS FALSE
    )
),
stats AS (
  SELECT 'text_source'::text ranking_type,'all'::text period,btrim(source_platform) term,count(*)::bigint item_count,max(updated_at) updated_at
  FROM text_base WHERE NULLIF(btrim(source_platform),'') IS NOT NULL GROUP BY btrim(source_platform)
  UNION ALL
  SELECT 'text_category','all',btrim(category),count(*),max(updated_at)
  FROM text_base WHERE NULLIF(btrim(category),'') IS NOT NULL GROUP BY btrim(category)
  UNION ALL
  SELECT 'text_type','all',btrim(content_type),count(*),max(updated_at)
  FROM text_base WHERE NULLIF(btrim(content_type),'') IS NOT NULL GROUP BY btrim(content_type)
  UNION ALL
  SELECT 'meta_source','all',btrim(source_platform),count(*),max(updated_at)
  FROM media_base WHERE NULLIF(btrim(source_platform),'') IS NOT NULL GROUP BY btrim(source_platform)
  UNION ALL
  SELECT 'meta_type','all',btrim(media_type),count(*),max(updated_at)
  FROM media_base WHERE NULLIF(btrim(media_type),'') IS NOT NULL GROUP BY btrim(media_type)
  UNION ALL
  SELECT 'meta_style','all',btrim(tag),count(*),max(m.updated_at)
  FROM media_base m
  CROSS JOIN LATERAL regexp_split_to_table(m.style_tags,'[[:space:]]*,[[:space:]]*') tag
  WHERE NULLIF(btrim(tag),'') IS NOT NULL
  GROUP BY btrim(tag)

  UNION ALL
  SELECT 'text_source',p.period,btrim(t.source_platform),count(*),max(t.updated_at)
  FROM period_ranges p JOIN text_base t
    ON t.item_date IS NOT NULL
   AND t.item_date>=p.start_date AND t.item_date<=COALESCE(p.end_date,CURRENT_DATE)
  WHERE NULLIF(btrim(t.source_platform),'') IS NOT NULL
  GROUP BY p.period,btrim(t.source_platform)
  UNION ALL
  SELECT 'text_category',p.period,btrim(t.category),count(*),max(t.updated_at)
  FROM period_ranges p JOIN text_base t
    ON t.item_date IS NOT NULL
   AND t.item_date>=p.start_date AND t.item_date<=COALESCE(p.end_date,CURRENT_DATE)
  WHERE NULLIF(btrim(t.category),'') IS NOT NULL
  GROUP BY p.period,btrim(t.category)
  UNION ALL
  SELECT 'text_type',p.period,btrim(t.content_type),count(*),max(t.updated_at)
  FROM period_ranges p JOIN text_base t
    ON t.item_date IS NOT NULL
   AND t.item_date>=p.start_date AND t.item_date<=COALESCE(p.end_date,CURRENT_DATE)
  WHERE NULLIF(btrim(t.content_type),'') IS NOT NULL
  GROUP BY p.period,btrim(t.content_type)
  UNION ALL
  SELECT 'meta_source',p.period,btrim(m.source_platform),count(*),max(m.updated_at)
  FROM period_ranges p JOIN media_base m
    ON m.item_date IS NOT NULL
   AND m.item_date>=p.start_date AND m.item_date<=COALESCE(p.end_date,CURRENT_DATE)
  WHERE NULLIF(btrim(m.source_platform),'') IS NOT NULL
  GROUP BY p.period,btrim(m.source_platform)
  UNION ALL
  SELECT 'meta_type',p.period,btrim(m.media_type),count(*),max(m.updated_at)
  FROM period_ranges p JOIN media_base m
    ON m.item_date IS NOT NULL
   AND m.item_date>=p.start_date AND m.item_date<=COALESCE(p.end_date,CURRENT_DATE)
  WHERE NULLIF(btrim(m.media_type),'') IS NOT NULL
  GROUP BY p.period,btrim(m.media_type)
  UNION ALL
  SELECT 'meta_style',p.period,btrim(tag),count(*),max(m.updated_at)
  FROM period_ranges p JOIN media_base m
    ON m.item_date IS NOT NULL
   AND m.item_date>=p.start_date AND m.item_date<=COALESCE(p.end_date,CURRENT_DATE)
  CROSS JOIN LATERAL regexp_split_to_table(m.style_tags,'[[:space:]]*,[[:space:]]*') tag
  WHERE NULLIF(btrim(tag),'') IS NOT NULL
  GROUP BY p.period,btrim(tag)
),
ranked AS (
  SELECT s.*,sum(item_count) OVER (PARTITION BY ranking_type,period) AS partition_count
  FROM stats s
)
SELECT ranking_type||':'||period||':'||term AS ranking_key,
       ranking_type,term,item_count::numeric AS rank_value,item_count,updated_at,
       period,item_count AS hit_count,
       round(100.0*item_count::numeric/NULLIF(partition_count,0),2) AS percent
FROM ranked;
