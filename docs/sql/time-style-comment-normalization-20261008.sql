-- Canonical Time style_comment = ONE name + ONE TEXT description + ONE existing anchor ID.
-- Migrate legacy per-period comma-separated style tags without guessing descriptions.
-- The first existing (non-'0') anchor of each legacy period becomes its style anchor;
-- the original anchor/period/event rows and their notes are never changed.
DO $migrate$
DECLARE
  tbl text; invalid_count integer; missing_count integer;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['lo3rwang_time','lrunes_time'] LOOP
    EXECUTE format($query$
      WITH source AS (
        SELECT t.record_id,t.style_tags,t.style_description,t.anchor_ids,
               btrim(tag.tag) AS tag,
               cardinality(regexp_split_to_array(t.style_tags,'[,，]')) AS tag_count,
               (SELECT btrim(substr(part,length(btrim(tag.tag))+2))
                FROM unnest(string_to_array(t.style_description,E'\n\n')) AS part
                WHERE starts_with(btrim(part),btrim(tag.tag)||'：') LIMIT 1) AS own_description
        FROM silver.%I t
        CROSS JOIN LATERAL regexp_split_to_table(t.style_tags,'[,，]') AS tag(tag)
        WHERE t.record_type IN ('period','event') AND nullif(btrim(t.style_tags),'') IS NOT NULL
      )
      SELECT count(*) FROM source WHERE nullif(tag,'') IS NULL
        OR nullif(btrim(CASE WHEN tag_count=1 THEN style_description ELSE own_description END),'') IS NULL
        OR coalesce((SELECT aid FROM unnest(anchor_ids) aid WHERE aid<>'0' AND aid<>'' LIMIT 1),'')=''
    $query$,tbl) INTO invalid_count;
    IF invalid_count>0 THEN RAISE EXCEPTION 'Cannot migrate %: % style tags lack a distinct description or an anchor. No changes made.',tbl,invalid_count; END IF;
  END LOOP;

  FOREACH tbl IN ARRAY ARRAY['lo3rwang_time','lrunes_time'] LOOP
    EXECUTE format('ALTER TABLE silver.%I DROP CONSTRAINT IF EXISTS %I',tbl,tbl||'_record_type_check');
    EXECUTE format($sql$
      ALTER TABLE silver.%I ADD CONSTRAINT %I
      CHECK (record_type = ANY (ARRAY['anchor','period','event','style_comment']))
    $sql$,tbl,tbl||'_record_type_check');
    EXECUTE format($sql$
      ALTER TABLE silver.%I ADD CONSTRAINT %I
      CHECK (record_type<>'style_comment' OR (
        nullif(btrim(label),'') IS NOT NULL
        AND nullif(btrim(style_description),'') IS NOT NULL
        AND cardinality(anchor_ids)=1
        AND nullif(btrim(anchor_ids[1]),'') IS NOT NULL
        AND anchor_ids[1]<>'0'
      ))
    $sql$,tbl,tbl||'_style_comment_shape_check');

    EXECUTE format($query$
      WITH src AS (
        SELECT t.record_id,t.style_description,t.anchor_ids,t.created_at,
               btrim(tag.tag) AS keyword,tag.ordinality AS tag_position,
               cardinality(regexp_split_to_array(t.style_tags,'[,，]')) AS tag_count,
               (SELECT btrim(substr(part,length(btrim(tag.tag))+2))
                FROM unnest(string_to_array(t.style_description,E'\n\n')) part
                WHERE starts_with(btrim(part),btrim(tag.tag)||'：') LIMIT 1) AS own_description
        FROM silver.%I t
        CROSS JOIN LATERAL regexp_split_to_table(t.style_tags,'[,，]') WITH ORDINALITY AS tag(tag,ordinality)
        WHERE t.record_type IN ('period','event') AND nullif(btrim(t.style_tags),'') IS NOT NULL
      )
      INSERT INTO silver.%I (record_type,resource_id,label,style_description,anchor_ids,created_at,updated_at)
      SELECT 'style_comment','style_comment:'||record_id::text||':'||tag_position::text,keyword,
             btrim(CASE WHEN tag_count=1 THEN style_description ELSE own_description END),
             ARRAY[(SELECT a FROM unnest(anchor_ids) a WHERE a<>'0' AND a<>'' LIMIT 1)],
             created_at,now()
      FROM src
      ON CONFLICT (record_type,resource_id) DO NOTHING
    $query$,tbl,tbl);

    -- Legacy tags/description on periods/events were duplicated storage.
    -- After the migration each canonical style record owns its description.
    EXECUTE format('ALTER TABLE silver.%I DROP COLUMN IF EXISTS style_tags',tbl);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON silver.%I (record_type,label)',tbl||'_style_comment_lookup_idx',tbl);
  END LOOP;
END;
$migrate$;

COMMENT ON COLUMN silver.lo3rwang_time.style_description IS 'For record_type=style_comment: exactly one style keyword label and this dedicated TEXT description, anchored via one anchor_ids entry';
COMMENT ON COLUMN silver.lrunes_time.style_description IS 'For record_type=style_comment: exactly one style keyword label and this dedicated TEXT description, anchored via one anchor_ids entry';
