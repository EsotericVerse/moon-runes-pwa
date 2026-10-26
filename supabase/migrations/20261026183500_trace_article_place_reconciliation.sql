-- Explicit post-import article linking. No importer writes source_place or
-- guesses anchors. Only unique exact normalized titles/approved aliases link.
CREATE TABLE IF NOT EXISTS silver.trace_place_alias (
  scope_id text NOT NULL CHECK (scope_id IN ('lo3rwang','lrunes')),
  place_key text NOT NULL CHECK (length(place_key) BETWEEN 1 AND 320),
  trace_id varchar(4) NOT NULL,
  original_name text NOT NULL,
  verified_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scope_id,place_key)
);
ALTER TABLE silver.trace_place_alias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS trace_place_alias_public_read ON silver.trace_place_alias;
CREATE POLICY trace_place_alias_public_read ON silver.trace_place_alias
 FOR SELECT TO PUBLIC USING (true);
DROP POLICY IF EXISTS trace_place_alias_authorized_insert ON silver.trace_place_alias;
CREATE POLICY trace_place_alias_authorized_insert ON silver.trace_place_alias
 FOR INSERT TO authenticated WITH CHECK (silver.can_manage_scope(scope_id));
DROP POLICY IF EXISTS trace_place_alias_authorized_update ON silver.trace_place_alias;
CREATE POLICY trace_place_alias_authorized_update ON silver.trace_place_alias
 FOR UPDATE TO authenticated USING (silver.can_manage_scope(scope_id))
 WITH CHECK (silver.can_manage_scope(scope_id));
GRANT SELECT ON silver.trace_place_alias TO anon,authenticated;
GRANT INSERT,UPDATE ON silver.trace_place_alias TO authenticated;

CREATE OR REPLACE FUNCTION silver.trace_normalize_place_name(p_name text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE
SET search_path TO 'pg_catalog','silver'
AS $fn$
 SELECT regexp_replace(lower(replace(btrim(coalesce(p_name,'')),'臺','台')),
  '[[:space:]　]+','','g')
$fn$;
GRANT EXECUTE ON FUNCTION silver.trace_normalize_place_name(text)
 TO anon,authenticated;

-- The preview is bounded to distinct source_place strings, not 35k articles.
CREATE OR REPLACE FUNCTION silver.preview_scope_trace_article_places(p_scope_id text)
RETURNS TABLE(source_place text,article_count bigint,matched_trace_id varchar(4),
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
      count(DISTINCT trace_id) AS n, min(trace_id) AS id
    FROM silver.%I WHERE trace_type='anchor'
    GROUP BY silver.trace_normalize_place_name(title)
  )
  SELECT raw.raw_name::text,raw.n,
    CASE WHEN approved.trace_id IS NOT NULL THEN approved.trace_id
         WHEN names.n=1 THEN names.id ELSE NULL END,
    CASE WHEN approved.trace_id IS NOT NULL THEN 'approved'
         WHEN names.n=1 THEN 'exact' WHEN names.n>1 THEN 'ambiguous'
         ELSE 'unmatched' END,
    coalesce(names.n,0)::bigint
  FROM raw LEFT JOIN names ON names.place_key=raw.place_key
  LEFT JOIN silver.trace_place_alias alias ON alias.scope_id=$1
    AND alias.place_key=raw.place_key
  LEFT JOIN silver.%I approved
    ON approved.trace_id=alias.trace_id AND approved.trace_type='anchor'
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
 EXECUTE format($sql$
  WITH names AS (
    SELECT silver.trace_normalize_place_name(title) AS place_key,
      count(DISTINCT trace_id) AS n,min(trace_id) AS id
    FROM silver.%I WHERE trace_type='anchor'
    GROUP BY silver.trace_normalize_place_name(title)
  ), choices AS (
    SELECT names.place_key,
      CASE WHEN approved.trace_id IS NOT NULL THEN approved.trace_id
           WHEN names.n=1 THEN names.id ELSE NULL END AS id
    FROM names
    LEFT JOIN silver.trace_place_alias alias ON alias.scope_id=$1
      AND alias.place_key=names.place_key
    LEFT JOIN silver.%I approved
      ON approved.trace_id=alias.trace_id AND approved.trace_type='anchor'
    UNION
    SELECT alias.place_key,approved.trace_id
    FROM silver.trace_place_alias alias
    JOIN silver.%I approved ON approved.trace_id=alias.trace_id AND approved.trace_type='anchor'
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
 p_scope_id text,p_source_place text,p_trace_id varchar(4))
RETURNS integer LANGUAGE plpgsql VOLATILE SECURITY INVOKER
SET search_path TO 'pg_catalog','silver'
AS $fn$
DECLARE normalized text; affected integer;
BEGIN
 IF p_scope_id NOT IN ('lo3rwang','lrunes') OR NOT silver.can_manage_scope(p_scope_id) THEN
   RAISE EXCEPTION 'No permission for this Scope';
 END IF;
 normalized:=silver.trace_normalize_place_name(p_source_place);
 IF length(normalized)<2 OR length(normalized)>320 THEN
   RAISE EXCEPTION 'Invalid source place';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM silver.loc_trace WHERE scope_id=p_scope_id
   AND trace_id=p_trace_id AND trace_type='anchor') THEN
   RAISE EXCEPTION 'Trace anchor not found in this Scope';
 END IF;
 INSERT INTO silver.trace_place_alias(scope_id,place_key,trace_id,original_name)
 VALUES(p_scope_id,normalized,p_trace_id,p_source_place)
 ON CONFLICT(scope_id,place_key) DO UPDATE
 SET trace_id=EXCLUDED.trace_id,original_name=EXCLUDED.original_name,
     verified_at=now();
 EXECUTE format($sql$
   UPDATE silver.%I
   SET place_id=$1
   WHERE place_id IS NULL AND silver.trace_normalize_place_name(source_place)=$2
 $sql$,p_scope_id||'_galaxy') USING p_trace_id,normalized;
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
