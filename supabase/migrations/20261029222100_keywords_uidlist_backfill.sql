-- Stage 2: reproduce every existing Keyword Item hit without rescanning content.
-- Migrate only the actively analyzed Class: Galaxy holds results for one Class
-- at a time. Other Classes correctly start with an empty uidlist.
WITH active AS (
  SELECT current_keyword_class_id AS class_id FROM silver.lo3rwang WHERE id='lo3rwang'
),
hits AS (
  SELECT g.uid::text AS uid,
    split_part(token,':',1)::integer AS old_item_number,
    split_part(token,':',2)::integer AS times
  FROM silver.lo3rwang_galaxy g
  CROSS JOIN LATERAL unnest(string_to_array(g.group_lists,',')) AS token
  WHERE g.group_lists NOT IN ('false','')
),
aggregated AS (
  SELECT k.keyword_id, jsonb_agg(
    jsonb_build_object('uid',h.uid,'times',h.times) ORDER BY h.uid COLLATE "C"
  ) AS uidlist
  FROM hits h
  JOIN silver.lo3rwang_keywords k ON k.item_no=h.old_item_number
  JOIN active a ON a.class_id=k.class_id
  GROUP BY k.keyword_id
)
UPDATE silver.lo3rwang_keywords k SET uidlist=a.uidlist
FROM aggregated a WHERE k.keyword_id=a.keyword_id;

-- The currently unused lrunes Galaxy has no classification hits, so its
-- Keyword Items intentionally keep their empty arrays until analyzed.
