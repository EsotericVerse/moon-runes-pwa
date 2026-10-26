-- Keep LOC-native Frame quick suggestions separate from materialized author scopes.
-- Only read the selected scope's routes; never modify anchor contents.
CREATE OR REPLACE FUNCTION silver.trace_popular_anchors(p_scope_id text,p_limit integer DEFAULT 10)
RETURNS TABLE(uid text,title text,county_id text,longitude double precision,latitude double precision,usage_count bigint)
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path TO 'pg_catalog','silver'
AS $function$
BEGIN
 IF p_scope_id NOT IN ('loc','lo3rwang','lrunes') THEN
   RAISE EXCEPTION 'Unsupported Trace Scope';
 END IF;
 RETURN QUERY EXECUTE format(
  'SELECT a.uid,a.title,a.county_id,a.longitude,a.latitude,count(*)::bigint AS usage_count
   FROM %I.%I m CROSS JOIN LATERAL unnest(m.anchor_uids) u(uid)
   JOIN %I.%I a ON a.uid=u.uid AND a.trace_type=''anchor''
   WHERE m.trace_type=''map'' %s
   GROUP BY a.uid,a.title,a.county_id,a.longitude,a.latitude
   ORDER BY usage_count DESC,a.title ASC,a.uid ASC LIMIT $1',
  'silver',p_scope_id||'_trace','silver',p_scope_id||'_trace',
  CASE WHEN p_scope_id='loc' THEN 'AND m.scope_id=''loc'' AND a.scope_id=''loc''' ELSE '' END
 ) USING least(greatest(coalesce(p_limit,10),1),10);
END;
$function$;
GRANT EXECUTE ON FUNCTION silver.trace_popular_anchors(text,integer) TO anon,authenticated;