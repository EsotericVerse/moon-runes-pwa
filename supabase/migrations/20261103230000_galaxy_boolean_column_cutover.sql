-- Expand first: the old Galaxy `able` column remains until the application
-- and MCP have deployed their boolean-column readers/writers.
ALTER TABLE silver.lrunes_galaxy ADD COLUMN IF NOT EXISTS "statics" boolean;
ALTER TABLE silver.lrunes_galaxy ADD COLUMN IF NOT EXISTS "culture" boolean;
ALTER TABLE silver.lrunes_galaxy ADD COLUMN IF NOT EXISTS "search" boolean;
ALTER TABLE silver.lrunes_galaxy ADD COLUMN IF NOT EXISTS "trace" boolean;
ALTER TABLE silver.lrunes_galaxy ADD COLUMN IF NOT EXISTS "list" boolean;
ALTER TABLE silver.lrunes_galaxy ADD COLUMN IF NOT EXISTS "keyword" boolean;
ALTER TABLE silver.lrunes_galaxy ADD COLUMN IF NOT EXISTS "others" boolean;
ALTER TABLE silver.lrunes_galaxy ADD COLUMN IF NOT EXISTS "extract" boolean;
UPDATE silver.lrunes_galaxy SET
  "statics"=COALESCE("statics",(able->>'statics')::boolean,TRUE),
  "culture"=COALESCE("culture",(able->>'culture')::boolean,TRUE),
  "search"=COALESCE("search",(able->>'search')::boolean,TRUE),
  "trace"=COALESCE("trace",(able->>'trace')::boolean,TRUE),
  "list"=COALESCE("list",(able->>'list')::boolean,TRUE),
  "keyword"=COALESCE("keyword",(able->>'keywords')::boolean,TRUE),
  "others"=COALESCE("others",(able->>'game')::boolean,TRUE),
  "extract"=COALESCE("extract",(able->>'extract')::boolean,TRUE)
WHERE "statics" IS NULL OR "culture" IS NULL OR "search" IS NULL OR "trace" IS NULL OR "list" IS NULL OR "keyword" IS NULL OR "others" IS NULL OR "extract" IS NULL;
UPDATE silver.lo3rwang_galaxy SET
  "statics"=COALESCE("statics",(able->>'statics')::boolean,TRUE),
  "culture"=COALESCE("culture",(able->>'culture')::boolean,TRUE),
  "search"=COALESCE("search",(able->>'search')::boolean,TRUE),
  "trace"=COALESCE("trace",(able->>'trace')::boolean,TRUE),
  "list"=COALESCE("list",(able->>'list')::boolean,TRUE),
  "keyword"=COALESCE("keyword",(able->>'keywords')::boolean,TRUE),
  "others"=COALESCE("others",(able->>'game')::boolean,TRUE),
  "extract"=COALESCE("extract",(able->>'extract')::boolean,TRUE)
WHERE "statics" IS NULL OR "culture" IS NULL OR "search" IS NULL OR "trace" IS NULL OR "list" IS NULL OR "keyword" IS NULL OR "others" IS NULL OR "extract" IS NULL;

-- Replace database-side feature guards without changing function contracts.
-- normalize_galaxy_content_validity
CREATE OR REPLACE FUNCTION silver.normalize_galaxy_content_validity()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  IF NEW.content IS NULL OR btrim(NEW.content)='' THEN
    NEW.content:=NULL;
    NEW.search:=false; NEW."list":=false;
  END IF;
  -- All MCP-sourced articles must remain hidden from the public full list,
  -- even if a caller omits an explicit list flag.
  IF lower(btrim(COALESCE(NEW.site,'')))='mcp' THEN
    NEW."list":=false;
  END IF;
  RETURN NEW;
END;$function$;

-- read_keyword_tree_summary
CREATE OR REPLACE FUNCTION silver.read_keyword_tree_summary(p_scope_id text, p_start date DEFAULT NULL::date, p_end date DEFAULT NULL::date, p_source text DEFAULT NULL::text, p_class_uid text DEFAULT NULL::text)
 RETURNS TABLE(kind text, item_key text, group_uid text, day text, hit_count bigint, document_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
 v_scope text:=lower(btrim(coalesce(p_scope_id,'')));
 v_config regclass;
 v_keywords regclass;
 v_keywords_source text;
 v_galaxy regclass;
 v_class text;
 v_current text;
 v_meta jsonb;
 v_old_done timestamptz;
 v_done timestamptz;
 v_public boolean:=false;
BEGIN
 IF v_scope !~ '^[a-z][a-z0-9]{0,14}$' OR NOT EXISTS(
   SELECT 1 FROM silver.manage WHERE id=v_scope AND manage_role='scope' AND active)
   THEN RAISE EXCEPTION 'Invalid Scope'; END IF;
 v_config:=to_regclass(format('silver.%I',v_scope));
 IF pg_catalog.to_regclass(pg_catalog.format('silver.%I_anchor',v_scope)) IS NOT NULL THEN
  v_keywords:=to_regclass(format('silver.%I_anchor',v_scope));
  v_keywords_source:=format('(SELECT uid, type, title AS name, description AS "desc", ARRAY(SELECT jsonb_array_elements_text(CASE WHEN type=''item'' THEN coalesce(attr->''keyword'',''[]''::jsonb) ELSE coalesce(attr->''uid'',''[]''::jsonb) END)) AS lists, attr AS uid_lists FROM silver.%I_anchor WHERE type IN (''category'',''class'',''group'',''item''))',v_scope);
 ELSE
  v_keywords:=to_regclass(format('silver.%I_keywords',v_scope));
  v_keywords_source:=v_keywords::text;
 END IF;
 v_galaxy:=to_regclass(format('silver.%I_galaxy',v_scope));
 IF v_config IS NULL OR v_keywords IS NULL OR v_galaxy IS NULL THEN RETURN; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=v_keywords AND attname='uid' AND attnum>0 AND NOT attisdropped) THEN RETURN; END IF;
 EXECUTE format('SELECT current_keyword_class_uid,keyword_meta,staticstime FROM %s WHERE id=$1',v_config)
 INTO v_current,v_meta,v_old_done USING v_scope;
 v_class:=coalesce(nullif(p_class_uid,''),v_current);
 IF v_class IS NULL OR v_class !~ ('^[A-Za-z0-9]{'||CASE WHEN pg_catalog.to_regclass(pg_catalog.format('silver.%I_anchor',v_scope)) IS NOT NULL THEN '8' ELSE '4' END||'}$') THEN RETURN; END IF;
 IF v_meta->'by_class'->v_class->>'completedAt' IS NOT NULL THEN
   v_done:=(v_meta->'by_class'->v_class->>'completedAt')::timestamptz;
 ELSIF v_class=v_current AND v_meta->>'class_uid'=v_class THEN
   v_done:=v_old_done;
 END IF;
 IF v_done IS NULL THEN RETURN; END IF;
 IF NOT coalesce((SELECT allowed FROM silver.manage('scope',v_scope)),false) AND
   NOT silver.keyword_class_is_shared(v_scope,v_class) THEN RETURN; END IF;
 RETURN QUERY EXECUTE format($query$
   WITH clazz AS (SELECT uid,lists FROM %1$s WHERE type='class' AND uid=$1),
   groups AS MATERIALIZED (
     SELECT g.uid::text AS uid,g.name,g.lists,g.uid_lists,c.order_no
     FROM clazz
     CROSS JOIN LATERAL unnest(clazz.lists) WITH ORDINALITY c(uid,order_no)
     JOIN %1$s g ON g.uid=c.uid AND g.type='group'
   ), items AS MATERIALIZED (
     SELECT i.uid::text AS uid,g.uid::text AS group_uid,i.uid_lists
     FROM groups g
     CROSS JOIN LATERAL unnest(g.lists) iid(uid)
     JOIN %1$s i ON i.uid=iid.uid AND i.type='item'
   ), group_hits AS MATERIALIZED (
     SELECT g.uid AS group_uid,article.uid::text AS article_uid,article.date::text AS d
     FROM groups g
     CROSS JOIN LATERAL jsonb_array_elements_text(coalesce(g.uid_lists->'uidlists',g.uid_lists->'articles','[]'::jsonb)) a(uid)
     JOIN %2$s article ON article.uid::text=a.uid
     WHERE (article.keyword)::boolean IS TRUE
      AND ($2 IS NULL OR article.date >= $2) AND ($3 IS NULL OR article.date <= $3)
      AND ($4 IS NULL OR article.site=$4)
   ), item_hits AS MATERIALIZED (
     SELECT i.uid AS item_uid,i.group_uid,article.uid::text AS article_uid,
       article.date::text AS d,CASE WHEN jsonb_typeof(h.entry)='string' THEN 1 ELSE (h.entry->>'times')::bigint END AS times, (i.uid_lists->>'total')::bigint AS total
     FROM items i
     CROSS JOIN LATERAL jsonb_array_elements(coalesce(i.uid_lists->'uidlists',i.uid_lists->'hits','[]'::jsonb)) h(entry)
     JOIN %2$s article ON article.uid::text=CASE WHEN jsonb_typeof(h.entry)='string' THEN h.entry #>> '{}' ELSE h.entry->>'uid' END
     WHERE (article.keyword)::boolean IS TRUE
      AND ($2 IS NULL OR article.date >= $2) AND ($3 IS NULL OR article.date <= $3)
      AND ($4 IS NULL OR article.site=$4)
   )
   SELECT 'eligible',NULL,NULL,'',count(DISTINCT article_uid),count(DISTINCT article_uid) FROM group_hits
   UNION ALL
   SELECT 'class_day',NULL,group_uid,d,count(DISTINCT article_uid),count(DISTINCT article_uid)
    FROM group_hits GROUP BY group_uid,d
   UNION ALL
   SELECT 'item',item_uid,group_uid,'',
      (CASE WHEN $2 IS NULL AND $3 IS NULL AND $4 IS NULL THEN coalesce(max(total),sum(times)) ELSE sum(times) END)::bigint,
      count(DISTINCT article_uid)
    FROM item_hits WHERE times>0 GROUP BY item_uid,group_uid
   UNION ALL
   SELECT 'item_day',item_uid,group_uid,d,sum(times)::bigint,count(DISTINCT article_uid)
    FROM item_hits WHERE times>0 GROUP BY item_uid,group_uid,d
   UNION ALL
   SELECT 'keyword_all_day',NULL,NULL,d,count(DISTINCT article_uid),count(DISTINCT article_uid)
    FROM item_hits WHERE times>0 GROUP BY d
   UNION ALL
   SELECT 'group_items_day',NULL,group_uid,d,count(DISTINCT article_uid),count(DISTINCT article_uid)
    FROM item_hits WHERE times>0 GROUP BY group_uid,d
 $query$,v_keywords_source,v_galaxy)
 USING v_class,p_start,p_end,nullif(p_source,'');
END
$function$;

-- read_scope_category_totals
CREATE OR REPLACE FUNCTION silver.read_scope_category_totals(p_scope_id text, p_start date, p_end date)
 RETURNS TABLE(kind text, category text, item_count integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_scope text:=lower(btrim(coalesce(p_scope_id,'')));v_galaxy regclass;
BEGIN
 IF v_scope !~ '^[a-z][a-z0-9]{0,14}$' THEN RAISE EXCEPTION 'Invalid scope' USING errcode='22023'; END IF;
 v_galaxy:=to_regclass(format('silver.%I',v_scope||'_galaxy'));
 IF v_galaxy IS NULL THEN RAISE EXCEPTION 'Unknown scope' USING errcode='22023'; END IF;
 RETURN QUERY EXECUTE format($q$
 SELECT 'source'::text,btrim(coalesce(site,''))::text,count(*)::integer
 FROM %s WHERE (statics)::boolean AND content<>''
 AND ($1 IS NULL OR date >= $1) AND ($2 IS NULL OR date <= $2)
 GROUP BY 1,2
 $q$,v_galaxy) USING p_start,p_end;
END;$function$;

-- read_scope_earliest
CREATE OR REPLACE FUNCTION silver.read_scope_earliest(p_scope_id text)
 RETURNS date
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_scope text:=lower(btrim(coalesce(p_scope_id,'')));v_galaxy regclass;v_day date;
BEGIN
 IF v_scope !~ '^[a-z][a-z0-9]{0,14}$' THEN RAISE EXCEPTION 'Invalid scope' USING errcode='22023'; END IF;
 v_galaxy:=to_regclass(format('silver.%I',v_scope||'_galaxy'));
 IF v_galaxy IS NULL THEN RAISE EXCEPTION 'Unknown scope' USING errcode='22023'; END IF;
 EXECUTE format('SELECT min(date) FROM %s WHERE (statics)::boolean AND content<>''''',v_galaxy) INTO v_day;
 RETURN v_day;
END;$function$;

-- read_scope_linked_media_count
CREATE OR REPLACE FUNCTION silver.read_scope_linked_media_count(p_scope_id text, p_start date DEFAULT NULL::date, p_end date DEFAULT NULL::date)
 RETURNS bigint
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_scope text:=lower(btrim(coalesce(p_scope_id,'')));v_anchor regclass;v_galaxy regclass;v_suffix text;v_count bigint;
BEGIN
 IF v_scope !~ '^[a-z][a-z0-9]{0,14}$' OR (p_start IS NOT NULL AND p_end IS NOT NULL AND p_start>p_end)
 THEN RAISE EXCEPTION 'Invalid Scope or date range' USING errcode='22023'; END IF;
 SELECT anchor_table INTO v_suffix FROM silver.manage WHERE id=v_scope AND manage_role='scope' AND active;
 IF NOT FOUND THEN RETURN 0; END IF;
 v_anchor:=to_regclass(format('silver.%I',v_scope||'_'||coalesce(nullif(v_suffix,''),'anchor')));
 v_galaxy:=to_regclass(format('silver.%I',v_scope||'_galaxy'));
 IF v_anchor IS NULL OR v_galaxy IS NULL THEN RETURN 0; END IF;
 EXECUTE format($q$
 SELECT count(*)::bigint FROM
 (SELECT DISTINCT unnest(g.media_link)::text AS uid FROM %1$s g
 WHERE (g.statics)::boolean IS TRUE AND coalesce(g.content,'')<>''
 AND ($1 IS NULL OR g.date >= $1) AND ($2 IS NULL OR g.date <= $2)) refs
 WHERE EXISTS (SELECT 1 FROM %2$s m WHERE m.uid=refs.uid
 AND m.type IN ('image','video','rune','suno') AND m.invisible IS FALSE)
 $q$,v_galaxy,v_anchor) INTO v_count USING p_start,p_end;
 RETURN coalesce(v_count,0);
END $function$;

-- read_scope_place_statistics
CREATE OR REPLACE FUNCTION silver.read_scope_place_statistics(p_scope_id text, p_start date DEFAULT NULL::date, p_end date DEFAULT NULL::date)
 RETURNS TABLE(day text, category text, item_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_id text := lower(btrim(coalesce(p_scope_id,'')));
  v_galaxy regclass;
  v_from timestamptz;
  v_to timestamptz;
BEGIN
  IF v_id !~ '^[a-z][a-z0-9]{0,14}$' OR v_id IN ('admin','local') THEN
    RAISE EXCEPTION 'Invalid public Scope id' USING errcode='22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM silver.manage
      WHERE id=v_id AND manage_role='scope') THEN
    RAISE EXCEPTION 'Unknown public Scope' USING errcode='22023';
  END IF;
  v_galaxy:=to_regclass(format('silver.%I',v_id||'_galaxy'));
  IF v_galaxy IS NULL THEN RAISE EXCEPTION 'Unknown Scope Galaxy' USING errcode='22023'; END IF;
  v_from:=CASE WHEN p_start IS NULL THEN NULL ELSE p_start::timestamp AT TIME ZONE 'Asia/Taipei' END;
  v_to:=CASE WHEN p_end IS NULL THEN NULL
    ELSE (p_end::timestamp + time '23:59:59.999') AT TIME ZONE 'Asia/Taipei' END;
  RETURN QUERY EXECUTE format($query$
    SELECT date::text,
      btrim(location)::text, COUNT(*)::bigint
    FROM %s
    WHERE (trace)::boolean IS TRUE
      AND content <> '' AND date IS NOT NULL
      AND location IS NOT NULL AND btrim(location)<>''
      AND ($1 IS NULL OR date >= $1)
      AND ($2 IS NULL OR date <= $2)
    GROUP BY 1,2 ORDER BY 1,2
  $query$,v_galaxy)
  USING p_start,p_end;
END;
$function$;

-- read_scope_statistics
CREATE OR REPLACE FUNCTION silver.read_scope_statistics(p_scope_id text, p_start date, p_end date, p_include_undated boolean)
 RETURNS TABLE(day text, kind text, category text, item_count integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_scope text:=lower(btrim(coalesce(p_scope_id,'')));v_galaxy regclass;
BEGIN
 IF v_scope !~ '^[a-z][a-z0-9]{0,14}$' THEN RAISE EXCEPTION 'Invalid scope' USING errcode='22023'; END IF;
 v_galaxy:=to_regclass(format('silver.%I',v_scope||'_galaxy'));
 IF v_galaxy IS NULL THEN RAISE EXCEPTION 'Unknown scope' USING errcode='22023'; END IF;
 RETURN QUERY EXECUTE format($q$
 WITH s AS(
  SELECT coalesce(date::text,'') AS d,btrim(coalesce(site,'')) AS c
  FROM %s WHERE (statics)::boolean AND content<>''
  AND ($3 OR date IS NOT NULL)
  AND ($1 IS NULL OR date >= $1) AND ($2 IS NULL OR date <= $2)
 )
 SELECT s.d,'source'::text,s.c,count(*)::integer FROM s GROUP BY 1,3
 UNION ALL
 SELECT s.d,'total'::text,'文字作品'::text,count(*)::integer FROM s GROUP BY 1
 ORDER BY 1,2,3
 $q$,v_galaxy) USING p_start,p_end,coalesce(p_include_undated,false);
END;$function$;

-- read_trace_keyword_group_totals
CREATE OR REPLACE FUNCTION silver.read_trace_keyword_group_totals(p_scope_id text, p_place_ids text[], p_start date DEFAULT NULL::date, p_end date DEFAULT NULL::date, p_source text DEFAULT NULL::text, p_class_uid text DEFAULT NULL::text)
 RETURNS TABLE(group_uid text, group_name text, document_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_scope text:=lower(btrim(coalesce(p_scope_id,'')));
  v_config regclass;
  v_galaxy regclass;
  v_keywords regclass;
 v_keywords_source text;
  v_class_uid text;
  v_current text;
  v_meta jsonb;
  v_old_ready timestamptz;
  v_ready timestamptz;
  v_public boolean:=false;
BEGIN
  IF v_scope !~ '^[a-z][a-z0-9]{0,14}$' OR
     NOT EXISTS(SELECT 1 FROM silver.manage WHERE id=v_scope AND manage_role='scope' AND active)
     THEN RAISE EXCEPTION 'Invalid Scope'; END IF;
  IF p_place_ids IS NULL OR cardinality(p_place_ids)<1 OR cardinality(p_place_ids)>80
    THEN RAISE EXCEPTION 'Place UID list must have 1-80 items'; END IF;
  IF EXISTS(SELECT 1 FROM unnest(p_place_ids) x WHERE x !~ ('^[0-9A-Za-z]{'||CASE WHEN pg_catalog.to_regclass(pg_catalog.format('silver.%I_anchor',v_scope)) IS NOT NULL THEN '8' ELSE '4' END||'}$'))
    THEN RAISE EXCEPTION 'Invalid Place UID'; END IF;
  v_config:=to_regclass(format('silver.%I',v_scope));
  v_galaxy:=to_regclass(format('silver.%I_galaxy',v_scope));
  IF pg_catalog.to_regclass(pg_catalog.format('silver.%I_anchor',v_scope)) IS NOT NULL THEN
  v_keywords:=to_regclass(format('silver.%I_anchor',v_scope));
  v_keywords_source:=format('(SELECT uid, type, title AS name, description AS "desc", ARRAY(SELECT jsonb_array_elements_text(CASE WHEN type=''item'' THEN coalesce(attr->''keyword'',''[]''::jsonb) ELSE coalesce(attr->''uid'',''[]''::jsonb) END)) AS lists, attr AS uid_lists FROM silver.%I_anchor WHERE type IN (''category'',''class'',''group'',''item''))',v_scope);
 ELSE
  v_keywords:=to_regclass(format('silver.%I_keywords',v_scope));
  v_keywords_source:=v_keywords::text;
 END IF;
  IF v_config IS NULL OR v_galaxy IS NULL OR v_keywords IS NULL
    THEN RAISE EXCEPTION 'Missing Scope data'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute
    WHERE attrelid=v_keywords AND attname='uid' AND attnum>0 AND NOT attisdropped)
    THEN RETURN; END IF;
  EXECUTE format('SELECT current_keyword_class_uid,keyword_meta,staticstime FROM %s WHERE id=$1',v_config)
    INTO v_current,v_meta,v_old_ready USING v_scope;
  v_class_uid:=coalesce(nullif(p_class_uid,''),v_current);
  IF v_class_uid IS NULL OR v_class_uid !~ ('^[A-Za-z0-9]{'||CASE WHEN pg_catalog.to_regclass(pg_catalog.format('silver.%I_anchor',v_scope)) IS NOT NULL THEN '8' ELSE '4' END||'}$') THEN RETURN; END IF;
  IF v_meta->'by_class'->v_class_uid->>'completedAt' IS NOT NULL THEN
    v_ready:=(v_meta->'by_class'->v_class_uid->>'completedAt')::timestamptz;
  ELSIF v_class_uid=v_current AND v_meta->>'class_uid'=v_class_uid THEN
    v_ready:=v_old_ready;
  END IF;
  IF v_ready IS NULL THEN RETURN; END IF;
  IF NOT coalesce((SELECT allowed FROM silver.manage('scope',v_scope)),false) AND
    NOT silver.keyword_class_is_shared(v_scope,v_class_uid) THEN RETURN; END IF;
  RETURN QUERY EXECUTE format($query$
    WITH cl AS (
      SELECT uid,lists FROM %1$s WHERE type='class' AND uid=$1
    ), groups AS (
      SELECT g.uid,g.name,g.uid_lists
      FROM cl c
      CROSS JOIN LATERAL unnest(c.lists) cid(value)
      JOIN %1$s g ON g.uid=cid.value AND g.type='group'
    ), articles AS MATERIALIZED (
      SELECT g.uid::text uid
      FROM %2$s g
      WHERE g.place_id=ANY($2) AND (g.keyword)::boolean IS TRUE
        AND TRUE
        AND ($3 IS NULL OR g.date >= $3)
        AND ($4 IS NULL OR g.date <= $4)
        AND ($5 IS NULL OR g.site=$5)
    )
    SELECT k.uid::text,k.name,count(DISTINCT a.uid)::bigint
    FROM groups k
    LEFT JOIN articles a ON (coalesce(k.uid_lists->'uidlists',k.uid_lists->'articles','[]'::jsonb)) ? a.uid
    GROUP BY k.uid,k.name
    ORDER BY k.name,k.uid
  $query$,v_keywords_source,v_galaxy)
  USING v_class_uid,p_place_ids,p_start,p_end,nullif(p_source,'');
END
$function$;

-- read_trace_place_density
CREATE OR REPLACE FUNCTION silver.read_trace_place_density(p_scope_id text, p_place_ids text[], p_start date DEFAULT NULL::date, p_end date DEFAULT NULL::date, p_source text DEFAULT NULL::text)
 RETURNS TABLE(day date, category text, item_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'silver'
AS $function$
BEGIN
 IF pg_catalog.to_regclass(pg_catalog.format('silver.%I_anchor',p_scope_id)) IS NULL THEN
   RAISE EXCEPTION 'Unsupported Trace article Scope';
 END IF;
 IF p_place_ids IS NULL OR cardinality(p_place_ids)=0 THEN RETURN; END IF;
 IF cardinality(p_place_ids)>80 OR EXISTS(
    SELECT 1 FROM unnest(p_place_ids) AS id
    WHERE id IS NULL OR ((pg_catalog.to_regclass(pg_catalog.format('silver.%I_anchor',p_scope_id)) IS NOT NULL AND id !~ '^[A-Za-z0-9]{8}$') OR (pg_catalog.to_regclass(pg_catalog.format('silver.%I_anchor',p_scope_id)) IS NULL AND id !~ '^[A-Za-z0-9]{4}$'))
 ) THEN RAISE EXCEPTION 'Invalid Trace place IDs'; END IF;
 RETURN QUERY EXECUTE format($sql$
   SELECT (g.createtime AT TIME ZONE 'Asia/Taipei')::date AS day,
          g.place_id::text AS category,count(*)::bigint AS item_count
   FROM silver.%I AS g
   WHERE g.place_id=ANY($1) AND (g.trace)::boolean IS TRUE
     AND TRUE AND g.createtime IS NOT NULL
     AND ($2::date IS NULL OR g.createtime >=
       ($2::date::timestamp AT TIME ZONE 'Asia/Taipei'))
     AND ($3::date IS NULL OR g.createtime <
       (($3::date+1)::timestamp AT TIME ZONE 'Asia/Taipei'))
     AND ($4::text IS NULL OR g.site ILIKE $4)
   GROUP BY 1,2 ORDER BY 1,2
 $sql$,p_scope_id||'_galaxy')
 USING p_place_ids,p_start,p_end,p_source;
END;
$function$;

-- refresh_scope_search_summary
CREATE OR REPLACE FUNCTION silver.refresh_scope_search_summary(p_scope_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'silver'
AS $function$
DECLARE
  v_id text := lower(btrim(coalesce(p_scope_id,'')));
  v_galaxy regclass;
  v_count bigint;
  v_words bigint;
  v_start date;
  v_end date;
  v_now timestamptz := clock_timestamp();
  v_snapshot jsonb;
  v_rows integer;
BEGIN
  IF v_id !~ '^[a-z][a-z0-9]{0,14}$' THEN
    RAISE EXCEPTION 'Invalid article Scope ID' USING errcode='22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM silver.manage WHERE id=v_id
                 AND manage_role='scope' AND active IS TRUE) THEN
    RAISE EXCEPTION 'Unknown or inactive article Scope' USING errcode='22023';
  END IF;
  IF NOT coalesce((SELECT allowed FROM silver.manage('scope',v_id)),false) THEN
    RAISE EXCEPTION 'Not authorized to refresh this Scope' USING errcode='42501';
  END IF;
  v_galaxy:=to_regclass(format('silver.%I',v_id||'_galaxy'));
  IF v_galaxy IS NULL THEN
    RAISE EXCEPTION 'Scope Galaxy unavailable' USING errcode='22023';
  END IF;
  EXECUTE format($q$
    SELECT count(*)::bigint,
      coalesce(sum(char_length(regexp_replace(regexp_replace(content,'<[^>]*>','','g'),
        '[[:space:]　]+','','g'))),0)::bigint,
      min(coalesce(date,(createtime at time zone 'Asia/Taipei')::date)),
      max(coalesce(date,(createtime at time zone 'Asia/Taipei')::date))
    FROM %s
    WHERE (search)::boolean IS TRUE
      AND nullif(btrim(content),'') IS NOT NULL
  $q$,v_galaxy)
  INTO v_count,v_words,v_start,v_end;
  v_snapshot:=jsonb_build_object(
    'article_count',v_count,'word_count',v_words,
    'first_date',v_start,'last_date',v_end,'refreshed_at',v_now
  );
  EXECUTE format(
    'UPDATE silver.%I SET status=jsonb_set(coalesce(status,''{}''::jsonb),''{search}'',$1,true) WHERE id=$2',
    v_id)
  USING v_snapshot,v_id;
  GET DIAGNOSTICS v_rows=ROW_COUNT;
  IF v_rows<>1 THEN
    RAISE EXCEPTION 'Scope status was not updated' USING errcode='22023';
  END IF;
  RETURN jsonb_build_object('scope_id',v_id)||v_snapshot;
END;
$function$;
