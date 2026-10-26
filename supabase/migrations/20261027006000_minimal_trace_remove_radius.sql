BEGIN;
CREATE OR REPLACE FUNCTION silver.sync_scope_trace_union()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','silver'
AS $fn$
DECLARE origin text;
BEGIN
 IF TG_TABLE_NAME='lo3rwang_trace' THEN origin:='lo3rwang';
 ELSIF TG_TABLE_NAME='lrunes_trace' THEN origin:='lrunes';
 ELSE RAISE EXCEPTION 'Unsupported trace source'; END IF;
 IF TG_OP='DELETE' THEN
   DELETE FROM silver.loc_trace WHERE scope_id=origin AND uid=OLD.uid;
   RETURN OLD;
 END IF;
 INSERT INTO silver.loc_trace AS target
 (scope_id,uid,trace_type,title,description,address,anchor_list,times)
 VALUES (origin,NEW.uid,NEW.trace_type,NEW.title,NEW.description,NEW.address,NEW.anchor_list,NEW.times)
 ON CONFLICT(scope_id,uid) DO UPDATE SET
 trace_type=excluded.trace_type,title=excluded.title,description=excluded.description,
 address=excluded.address,anchor_list=excluded.anchor_list,times=excluded.times;
 RETURN NEW;
END $fn$;
ALTER TABLE silver.lo3rwang_trace DROP CONSTRAINT IF EXISTS lo3rwang_trace_radius_valid;
ALTER TABLE silver.lrunes_trace DROP CONSTRAINT IF EXISTS lrunes_trace_radius_valid;
ALTER TABLE silver.loc_trace DROP CONSTRAINT IF EXISTS loc_trace_radius_valid;
ALTER TABLE silver.lo3rwang_trace DROP COLUMN IF EXISTS radius_m;
ALTER TABLE silver.lrunes_trace DROP COLUMN IF EXISTS radius_m;
ALTER TABLE silver.loc_trace DROP COLUMN IF EXISTS radius_m;
COMMIT;