-- Statistics multimedia categories were retired: their counts are now supplied
-- by independently analyzed Keyword Class / Group / Item data.
-- Keep galaxy.media_link intact for normal article-to-media relations.
-- Drop the old media_link -> Anchor counting helper without CASCADE.
CREATE OR REPLACE FUNCTION silver.read_scope_overview(
  p_scope_id text, p_start date DEFAULT NULL::date, p_end date DEFAULT NULL::date
)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path TO ''
AS $function$
  SELECT jsonb_build_object(
    'earliest',silver.read_scope_earliest(p_scope_id),
    'rows',coalesce((SELECT jsonb_agg(jsonb_build_object(
      'day',s.day,'kind',s.kind,'category',s.category,'item_count',s.item_count))
      FROM silver.read_scope_statistics(p_scope_id,p_start,p_end,false) s),'[]'::jsonb),
    'categories',coalesce((SELECT jsonb_agg(jsonb_build_object(
      'category_code',lower(trim(x.name)),'display_name',trim(x.name),'enabled',true) ORDER BY x.ord)
      FROM silver.loc l
      CROSS JOIN LATERAL jsonb_array_elements_text(l."DefaultArticleClass")
        WITH ORDINALITY x(name,ord) WHERE l.id='loc'),'[]'::jsonb),
    'aliases',coalesce((SELECT jsonb_agg(jsonb_build_object(
      'source_key',lower(trim(x.name)),'category_code',lower(trim(x.name))) ORDER BY x.ord)
      FROM silver.loc l
      CROSS JOIN LATERAL jsonb_array_elements_text(l."DefaultArticleClass")
        WITH ORDINALITY x(name,ord) WHERE l.id='loc'),'[]'::jsonb)
  )
$function$;

DROP FUNCTION IF EXISTS silver.read_scope_linked_media_count(text,date,date);
