-- Bounded indexed aggregate for Trace articles keyed by four-character
-- Scope-local place_id. SECURITY INVOKER preserves existing Galaxy RLS.
CREATE OR REPLACE FUNCTION silver.read_trace_place_density(
  p_scope_id text,p_place_ids text[],
  p_start date DEFAULT NULL,p_end date DEFAULT NULL,p_source text DEFAULT NULL)
RETURNS TABLE(day date,category text,item_count bigint)
LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path TO 'pg_catalog','silver'
AS $fn$
BEGIN
 IF p_scope_id NOT IN ('lo3rwang','lrunes') THEN
   RAISE EXCEPTION 'Unsupported Trace article Scope';
 END IF;
 IF p_place_ids IS NULL OR cardinality(p_place_ids)=0 THEN RETURN; END IF;
 IF cardinality(p_place_ids)>80 OR EXISTS(
    SELECT 1 FROM unnest(p_place_ids) AS id
    WHERE id IS NULL OR id !~ '^[A-Za-z0-9]{4}$'
 ) THEN RAISE EXCEPTION 'Invalid Trace place IDs'; END IF;
 RETURN QUERY EXECUTE format($sql$
   SELECT (g.createtime AT TIME ZONE 'Asia/Taipei')::date AS day,
          g.place_id::text AS category,count(*)::bigint AS item_count
   FROM silver.%I AS g
   WHERE g.place_id=ANY($1) AND g.searchable IS TRUE
     AND g.statistics_able IS TRUE AND g.createtime IS NOT NULL
     AND ($2::date IS NULL OR g.createtime >=
       ($2::date::timestamp AT TIME ZONE 'Asia/Taipei'))
     AND ($3::date IS NULL OR g.createtime <
       (($3::date+1)::timestamp AT TIME ZONE 'Asia/Taipei'))
     AND ($4::text IS NULL OR g.source_name ILIKE $4)
   GROUP BY 1,2 ORDER BY 1,2
 $sql$,p_scope_id||'_galaxy')
 USING p_place_ids,p_start,p_end,p_source;
END;
$fn$;

REVOKE ALL ON FUNCTION silver.read_trace_place_density(text,text[],date,date,text)
 FROM PUBLIC;
GRANT EXECUTE ON FUNCTION silver.read_trace_place_density(text,text[],date,date,text)
 TO anon,authenticated;
COMMENT ON FUNCTION silver.read_trace_place_density(text,text[],date,date,text) IS
 'Scope-local, RLS-invoker daily article counts by indexed Galaxy.place_id; no full-text transfer.';
