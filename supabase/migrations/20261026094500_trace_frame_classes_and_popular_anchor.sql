-- Named Trace Frame labels; no changes to original anchor identities or Galaxy content.
ALTER TABLE silver.lo3rwang_trace ADD COLUMN IF NOT EXISTS "class" text NOT NULL DEFAULT '', ADD COLUMN IF NOT EXISTS class_group text NOT NULL DEFAULT '';
ALTER TABLE silver.lrunes_trace ADD COLUMN IF NOT EXISTS "class" text NOT NULL DEFAULT '', ADD COLUMN IF NOT EXISTS class_group text NOT NULL DEFAULT '';
ALTER TABLE silver.loc_trace ADD COLUMN IF NOT EXISTS "class" text NOT NULL DEFAULT '', ADD COLUMN IF NOT EXISTS class_group text NOT NULL DEFAULT '';
-- Mirror map labels with the existing scoped union; source rows remain authoritative.
CREATE OR REPLACE FUNCTION silver.sync_scope_trace_union()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','silver'
AS $function$
DECLARE origin text;
BEGIN
 IF TG_TABLE_SCHEMA <> 'silver' THEN RAISE EXCEPTION 'Unsupported trace schema'; END IF;
 IF TG_TABLE_NAME='lo3rwang_trace' THEN origin:='lo3rwang';
 ELSIF TG_TABLE_NAME='lrunes_trace' THEN origin:='lrunes';
 ELSE RAISE EXCEPTION 'Unsupported trace source'; END IF;
 IF TG_OP='DELETE' THEN
   DELETE FROM silver.loc_trace WHERE scope_id=origin AND uid=OLD.uid;
   RETURN OLD;
 END IF;
 INSERT INTO silver.loc_trace AS target
   (scope_id,uid,trace_type,title,description,longitude,latitude,radius_m,anchor_uids,created_at,times,county_id,"class",class_group)
 VALUES
   (origin,NEW.uid,NEW.trace_type,NEW.title,NEW.description,NEW.longitude,NEW.latitude,
    NEW.radius_m,NEW.anchor_uids,NEW.created_at,NEW.times,NEW.county_id,NEW."class",NEW.class_group)
 ON CONFLICT(scope_id,uid) DO UPDATE SET
   trace_type=EXCLUDED.trace_type,title=EXCLUDED.title,description=EXCLUDED.description,
   longitude=EXCLUDED.longitude,latitude=EXCLUDED.latitude,radius_m=EXCLUDED.radius_m,
   anchor_uids=EXCLUDED.anchor_uids,created_at=EXCLUDED.created_at,
   times=EXCLUDED.times,county_id=EXCLUDED.county_id,"class"=EXCLUDED."class",class_group=EXCLUDED.class_group;
 RETURN NEW;
END;
$function$;
-- Read-only top-10 quick suggestions: count repeated usage across named route Frames.
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
  CASE WHEN p_scope_id='loc' THEN 'AND m.scope_id=a.scope_id' ELSE '' END
 ) USING least(greatest(coalesce(p_limit,10),1),10);
END;
$function$;
GRANT EXECUTE ON FUNCTION silver.trace_popular_anchors(text,integer) TO anon,authenticated;
CREATE INDEX IF NOT EXISTS lrunes_trace_county_anchor_idx
 ON silver.lrunes_trace(county_id,title,uid) WHERE trace_type='anchor';