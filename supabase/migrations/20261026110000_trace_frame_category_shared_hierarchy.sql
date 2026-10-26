-- Four-level Trace navigation: category -> class -> class_group -> map Item.
-- The existing anchor_uids Queue stays inside each map Item.
-- Additive, backwards-compatible: old maps have category=''.
-- Do not change Galaxy, keyword analysis or RLS policies.
BEGIN;
ALTER TABLE silver.loc_trace ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT '';
ALTER TABLE silver.lo3rwang_trace ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT '';
ALTER TABLE silver.lrunes_trace ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT '';

-- Preserve the existing source-to-LOC union mirror and security boundary.
-- The source row is the authority; do not turn LOC native rows into mirrors.
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
   (scope_id,uid,trace_type,title,description,longitude,latitude,radius_m,
    anchor_uids,created_at,times,county_id,"class",class_group,
    address,floor_label,floor_level,category)
 VALUES
   (origin,NEW.uid,NEW.trace_type,NEW.title,NEW.description,
    NEW.longitude,NEW.latitude,NEW.radius_m,NEW.anchor_uids,NEW.created_at,
    NEW.times,NEW.county_id,NEW."class",NEW.class_group,
    NEW.address,NEW.floor_label,NEW.floor_level,NEW.category)
 ON CONFLICT(scope_id,uid) DO UPDATE SET
   trace_type=EXCLUDED.trace_type,title=EXCLUDED.title,description=EXCLUDED.description,
   longitude=EXCLUDED.longitude,latitude=EXCLUDED.latitude,radius_m=EXCLUDED.radius_m,
   anchor_uids=EXCLUDED.anchor_uids,created_at=EXCLUDED.created_at,times=EXCLUDED.times,
   county_id=EXCLUDED.county_id,"class"=EXCLUDED."class",
   class_group=EXCLUDED.class_group,address=EXCLUDED.address,
   floor_label=EXCLUDED.floor_label,floor_level=EXCLUDED.floor_level,
   category=EXCLUDED.category;
 RETURN NEW;
END;
$function$;
COMMIT;
