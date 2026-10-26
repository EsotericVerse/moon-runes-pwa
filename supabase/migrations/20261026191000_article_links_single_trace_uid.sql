-- Companion to 20261026190000: no second Trace identity.
-- Reconcile by the single per-Scope trace.uid, with exact or approved aliases.
BEGIN;
SET LOCAL lock_timeout='8s';
SET LOCAL statement_timeout='45s';
DROP FUNCTION IF EXISTS silver.preview_scope_trace_article_places(text);
DROP FUNCTION IF EXISTS silver.approve_scope_trace_place_alias(text,text,varchar);
CREATE OR REPLACE FUNCTION silver.preview_scope_trace_article_places(p_scope_id text)
RETURNS TABLE(source_place text,article_count bigint,matched_uid varchar(4),
              match_status text,candidate_count bigint)
LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path TO 'pg_catalog','silver'
AS $fn$
BEGIN
 IF p_scope_id NOT IN ('lo3rwang','lrunes') THEN
   RAISE EXCEPTION 'Unsupported Scope';
 END IF;
 IF NOT silver.can_manage_scope(p_scope_id) THEN
   RAISE EXCEPTION 'No permission to organize this Scope';
 END IF;
 RETURN QUERY EXECUTE format($sql$
  WITH raw AS (
    SELECT source_place AS raw_name,count(*) AS n,
      silver.trace_normalize_place_name(source_place) AS place_key
    FROM silver.%I
    WHERE place_id IS NULL AND nullif(btrim(source_place),'') IS NOT NULL
    GROUP BY source_place
  ), names AS (
    SELECT silver.trace_normalize_place_name(title) AS place_key,
      count(DISTINCT uid) AS n, min(uid) AS id
    FROM silver.%I WHERE trace_type='anchor'
    GROUP BY silver.trace_normalize_place_name(title)
  )
  SELECT raw.raw_name::text,raw.n,
    CASE WHEN approved.uid IS NOT NULL THEN approved.uid
         WHEN names.n=1 THEN names.id ELSE NULL END,
    CASE WHEN approved.uid IS NOT NULL THEN 'approved'
         WHEN names.n=1 THEN 'exact' WHEN names.n>1 THEN 'ambiguous'
         ELSE 'unmatched' END,
    coalesce(names.n,0)::bigint
  FROM raw LEFT JOIN names ON names.place_key=raw.place_key
  LEFT JOIN silver.trace_place_alias alias ON alias.scope_id=$1
    AND alias.place_key=raw.place_key
  LEFT JOIN silver.%I approved
    ON approved.uid=alias.anchor_uid AND approved.trace_type='anchor'
  ORDER BY raw.n DESC,raw.raw_name LIMIT 1000
 $sql$,p_scope_id||'_galaxy',p_scope_id||'_trace',p_scope_id||'_trace')
 USING p_scope_id;
END;
$fn$;

CREATE OR REPLACE FUNCTION silver.apply_scope_trace_article_places(p_scope_id text)
RETURNS integer
LANGUAGE plpgsql VOLATILE SECURITY INVOKER
SET search_path TO 'pg_catalog','silver'
AS $fn$
DECLARE affected integer;
BEGIN
 IF p_scope_id NOT IN ('lo3rwang','lrunes') THEN
   RAISE EXCEPTION 'Unsupported Scope';
 END IF;
 IF NOT silver.can_manage_scope(p_scope_id) THEN
   RAISE EXCEPTION 'No permission to link this Scope articles';
 END IF;
 -- Place identities must be deduplicated before linking any articles.
 -- This guard intentionally does not read/write Galaxy.source_place.
 EXECUTE format('SELECT count(*) FROM silver.%I WHERE trace_type=''anchor''',p_scope_id||'_trace')
   INTO affected;
 IF affected >= 100 THEN
   RAISE EXCEPTION '請先整理現有空間定錨點至 100 筆以下，才可建立文章 place_id 關聯';
 END IF;
 EXECUTE format($sql$
  WITH names AS (
    SELECT silver.trace_normalize_place_name(title) AS place_key,
      count(DISTINCT uid) AS n,min(uid) AS id
    FROM silver.%I WHERE trace_type='anchor'
    GROUP BY silver.trace_normalize_place_name(title)
  ), choices AS (
    SELECT names.place_key,
      CASE WHEN approved.uid IS NOT NULL THEN approved.uid
           WHEN names.n=1 THEN names.id ELSE NULL END AS id
    FROM names
    LEFT JOIN silver.trace_place_alias alias ON alias.scope_id=$1
      AND alias.place_key=names.place_key
    LEFT JOIN silver.%I approved
      ON approved.uid=alias.anchor_uid AND approved.trace_type='anchor'
    UNION
    SELECT alias.place_key,approved.uid
    FROM silver.trace_place_alias alias
    JOIN silver.%I approved ON approved.uid=alias.anchor_uid AND approved.trace_type='anchor'
    WHERE alias.scope_id=$1
      AND NOT EXISTS(SELECT 1 FROM names WHERE names.place_key=alias.place_key)
  )
  UPDATE silver.%I g SET place_id=choices.id
  FROM choices WHERE g.place_id IS NULL AND choices.id IS NOT NULL
    AND silver.trace_normalize_place_name(g.source_place)=choices.place_key
 $sql$,p_scope_id||'_trace',p_scope_id||'_trace',
   p_scope_id||'_trace',p_scope_id||'_galaxy')
 USING p_scope_id;
 GET DIAGNOSTICS affected=ROW_COUNT;
 RETURN affected;
END;
$fn$;

CREATE OR REPLACE FUNCTION silver.approve_scope_trace_place_alias(
 p_scope_id text,p_source_place text,p_anchor_uid varchar(4))
RETURNS integer LANGUAGE plpgsql VOLATILE SECURITY INVOKER
SET search_path TO 'pg_catalog','silver'
AS $fn$
DECLARE normalized text; affected integer;
BEGIN
 IF p_scope_id NOT IN ('lo3rwang','lrunes') OR NOT silver.can_manage_scope(p_scope_id) THEN
   RAISE EXCEPTION 'No permission for this Scope';
 END IF;
 -- A manual alias must not bypass the same deduplication-first gate.
 EXECUTE format('SELECT count(*) FROM silver.%I WHERE trace_type=''anchor''',p_scope_id||'_trace')
   INTO affected;
 IF affected >= 100 THEN
   RAISE EXCEPTION '請先整理現有空間定錨點至 100 筆以下，才可連結文章 place_id';
 END IF;
 normalized:=silver.trace_normalize_place_name(p_source_place);
 IF length(normalized)<2 OR length(normalized)>320 THEN
   RAISE EXCEPTION 'Invalid source place';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM silver.loc_trace WHERE scope_id=p_scope_id
   AND uid=p_anchor_uid AND trace_type='anchor') THEN
   RAISE EXCEPTION 'Trace anchor not found in this Scope';
 END IF;
 INSERT INTO silver.trace_place_alias(scope_id,place_key,anchor_uid,original_name)
 VALUES(p_scope_id,normalized,p_anchor_uid,p_source_place)
 ON CONFLICT(scope_id,place_key) DO UPDATE
 SET anchor_uid=EXCLUDED.anchor_uid,original_name=EXCLUDED.original_name,
     verified_at=now();
 EXECUTE format($sql$
   UPDATE silver.%I
   SET place_id=$1
   WHERE place_id IS NULL AND silver.trace_normalize_place_name(source_place)=$2
 $sql$,p_scope_id||'_galaxy') USING p_anchor_uid,normalized;
 GET DIAGNOSTICS affected=ROW_COUNT;
 RETURN affected;
END;
$fn$;

REVOKE ALL ON FUNCTION silver.preview_scope_trace_article_places(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION silver.apply_scope_trace_article_places(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION silver.approve_scope_trace_place_alias(text,text,varchar) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION silver.preview_scope_trace_article_places(text) TO authenticated;
GRANT EXECUTE ON FUNCTION silver.apply_scope_trace_article_places(text) TO authenticated;
GRANT EXECUTE ON FUNCTION silver.approve_scope_trace_place_alias(text,text,varchar) TO authenticated;

-- Old trace_id was an accidental parallel UID column and is no longer read.
-- Keep archived old_uid => new_uid in the inaccessible migration backup.
ALTER TABLE silver.lo3rwang_trace DROP COLUMN trace_id;
ALTER TABLE silver.lrunes_trace DROP COLUMN trace_id;
ALTER TABLE silver.loc_trace DROP COLUMN trace_id;
COMMENT ON COLUMN silver.lo3rwang_trace.uid IS 'Single 4-char Scope-local UID; trace_type distinguishes anchor and map.';
COMMENT ON COLUMN silver.lrunes_trace.uid IS 'Single 4-char Scope-local UID; trace_type distinguishes anchor and map.';
COMMENT ON COLUMN silver.loc_trace.uid IS 'Scope-local UID keyed with scope_id in LOC union.';
COMMIT;
