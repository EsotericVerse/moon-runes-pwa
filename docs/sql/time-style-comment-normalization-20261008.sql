-- Canonical Time style_comment = ONE name + ONE TEXT description + ONE existing anchor ID.
-- Import each old style as one independent row. Only author-confirmed anchors
-- are mapped: 治理自己→2026-08-04, 文字建築學→2025-10-16,
-- 數位的長袖善舞→2026-10-06. 微月光 and 白晝之月 stay needs_anchor until
-- the author confirms their earliest evidenced lyrics dates. Do not infer
-- a date from the parent period. The retired name 混沌校對者 is not imported.
-- The original anchor/period/event rows and their notes are never changed.
DO $migrate$
DECLARE
  tbl text; invalid_count integer; mismatch_count integer;
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
        WHERE t.record_type IN ('period','event') AND nullif(btrim(t.style_tags),'') IS NOT NULL AND btrim(tag.tag)<>'混沌校對者'
      )
      SELECT count(*) FROM source WHERE nullif(tag,'') IS NULL
        OR nullif(btrim(CASE WHEN tag_count=1 THEN style_description ELSE own_description END),'') IS NULL

    $query$,tbl) INTO invalid_count;
    IF invalid_count>0 THEN RAISE EXCEPTION 'Cannot migrate %: % legacy style tags lack a distinct description. No changes made.',tbl,invalid_count; END IF;
  END LOOP;

  FOREACH tbl IN ARRAY ARRAY['lo3rwang_time','lrunes_time'] LOOP
    -- Only use explicit date/anchor mappings the author provided.
    IF tbl='lo3rwang_time' THEN
      EXECUTE format($guard$
        SELECT count(*) FROM (
          VALUES ('治理自己','recuperation-end','2026-08-04'),
                 ('文字建築學','loc-named','2025-10-16'),
                 ('數位的長袖善舞','p7-start','2026-10-06')
        ) AS v(tag,aid,day)
        WHERE EXISTS (
          SELECT 1 FROM silver.%I p
          WHERE p.record_type IN ('period','event')
            AND v.tag=ANY(regexp_split_to_array(p.style_tags,'[,，]'))
        )
        AND NOT EXISTS (
          SELECT 1 FROM silver.%I a WHERE a.record_type='anchor'
            AND a.resource_id=v.aid AND a.time_date=v.day::date
        )
      $guard$,tbl,tbl) INTO mismatch_count;
      IF mismatch_count>0 THEN
        RAISE EXCEPTION 'Explicit user-confirmed style anchors do not match actual date/IDs. No changes made.';
      END IF;
    END IF;
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
        AND (
          (status='needs_anchor' AND anchor_ids IS NULL)
          OR
          (status IS DISTINCT FROM 'needs_anchor'
           AND coalesce(cardinality(anchor_ids),0)=1
           AND nullif(btrim(coalesce(anchor_ids[1],'')),'') IS NOT NULL
           AND coalesce(anchor_ids[1],'0')<>'0')
        )
      ))
    $sql$,tbl,tbl||'_style_comment_shape_check');

    EXECUTE format($query$
      WITH src AS (
        SELECT t.record_id,t.style_description,t.display_order,t.created_at,
               btrim(tag.tag) AS keyword,tag.ordinality AS tag_position,
               cardinality(regexp_split_to_array(t.style_tags,'[,，]')) AS tag_count,
               (SELECT btrim(substr(part,length(btrim(tag.tag))+2))
                FROM unnest(string_to_array(t.style_description,E'\n\n')) part
                WHERE starts_with(btrim(part),btrim(tag.tag)||'：') LIMIT 1) AS own_description
        FROM silver.%I t
        CROSS JOIN LATERAL regexp_split_to_table(t.style_tags,'[,，]') WITH ORDINALITY AS tag(tag,ordinality)
        WHERE t.record_type IN ('period','event') AND nullif(btrim(t.style_tags),'') IS NOT NULL AND btrim(tag.tag)<>'混沌校對者'
      )
      INSERT INTO silver.%I (record_type,resource_id,label,style_description,anchor_ids,status,display_order,created_at,updated_at)
      SELECT 'style_comment','style_comment:'||record_id::text||':'||tag_position::text,keyword,
             btrim(CASE WHEN tag_count=1 THEN style_description ELSE own_description END),
             CASE keyword
               WHEN '治理自己' THEN ARRAY['recuperation-end']::text[]
               WHEN '文字建築學' THEN ARRAY['loc-named']::text[]
               WHEN '數位的長袖善舞' THEN ARRAY['p7-start']::text[]
               ELSE NULL::text[]
             END,
             CASE WHEN keyword IN ('治理自己','文字建築學','數位的長袖善舞') THEN 'active' ELSE 'needs_anchor' END,
             display_order,created_at,now()
      FROM src
      ON CONFLICT (record_type,resource_id) DO NOTHING
    $query$,tbl,tbl);

    -- Verify every imported style label and its exact per-style description
    -- before erasing the temporary legacy representation. A conflict with
    -- unexpected data aborts the whole transaction rather than losing text.
    EXECUTE format($check$
      WITH src AS (
        SELECT t.record_id,t.style_description,btrim(tag.tag) AS keyword,
               tag.ordinality AS tag_position,
               cardinality(regexp_split_to_array(t.style_tags,'[,，]')) AS tag_count,
               (SELECT btrim(substr(part,length(btrim(tag.tag))+2))
                FROM unnest(string_to_array(t.style_description,E'\n\n')) AS part
                WHERE starts_with(btrim(part),btrim(tag.tag)||'：') LIMIT 1) AS own_description
        FROM silver.%I t
        CROSS JOIN LATERAL regexp_split_to_table(t.style_tags,'[,，]') WITH ORDINALITY AS tag(tag,ordinality)
        WHERE t.record_type IN ('period','event') AND nullif(btrim(t.style_tags),'') IS NOT NULL AND btrim(tag.tag)<>'混沌校對者'
      )
      SELECT count(*) FROM src
      LEFT JOIN silver.%I c ON c.record_type='style_comment'
        AND c.resource_id='style_comment:'||src.record_id::text||':'||src.tag_position::text
      WHERE c.record_id IS NULL OR c.label IS DISTINCT FROM src.keyword
        OR c.style_description IS DISTINCT FROM
          btrim(CASE WHEN src.tag_count=1 THEN src.style_description ELSE src.own_description END)
    $check$,tbl,tbl) INTO mismatch_count;
    IF mismatch_count>0 THEN
      RAISE EXCEPTION 'Legacy style import mismatch in %: % missing/changed records. No changes made.',tbl,mismatch_count;
    END IF;

    -- Move the author text into each individual style_comment row, rather
    -- than keeping another competing narrative on the source period/event.
    EXECUTE format($clear$
      UPDATE silver.%I SET style_description=NULL
      WHERE record_type IN ('period','event') AND nullif(btrim(style_tags),'') IS NOT NULL
    $clear$,tbl);
    EXECUTE format('ALTER TABLE silver.%I DROP COLUMN IF EXISTS style_tags',tbl);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON silver.%I (record_type,label)',tbl||'_style_comment_lookup_idx',tbl);
  END LOOP;
END;
$migrate$;

COMMENT ON COLUMN silver.lo3rwang_time.style_description IS 'Each style_comment owns one style name and one dedicated TEXT description. A needs_anchor draft is not active; published styles reference exactly one existing anchor.';
COMMENT ON COLUMN silver.lrunes_time.style_description IS 'Each style_comment owns one style name and one dedicated TEXT description. A needs_anchor draft is not active; published styles reference exactly one existing anchor.';
