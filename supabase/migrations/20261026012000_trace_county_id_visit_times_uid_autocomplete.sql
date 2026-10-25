-- Trace spatial anchor identity and repeated-visit metadata.
-- This mirrors the already-verified Supabase primary schema. No data is
-- deleted or deduplicated by this migration. The route keeps ordered UIDs.
-- ISO county IDs are assigned on verified writes by the application; existing
-- historical anchors are backfilled separately from reviewed coordinate data.
ALTER TABLE silver.lo3rwang_trace
  ADD COLUMN IF NOT EXISTS times timestamptz[] NOT NULL DEFAULT '{}'::timestamptz[],
  ADD COLUMN IF NOT EXISTS county_id text;
ALTER TABLE silver.lrunes_trace
  ADD COLUMN IF NOT EXISTS times timestamptz[] NOT NULL DEFAULT '{}'::timestamptz[],
  ADD COLUMN IF NOT EXISTS county_id text;
ALTER TABLE silver.loc_trace
  ADD COLUMN IF NOT EXISTS times timestamptz[] NOT NULL DEFAULT '{}'::timestamptz[],
  ADD COLUMN IF NOT EXISTS county_id text;

CREATE INDEX IF NOT EXISTS lo3rwang_trace_county_anchor_idx
  ON silver.lo3rwang_trace (county_id,title,uid) WHERE trace_type='anchor';
CREATE INDEX IF NOT EXISTS loc_trace_county_anchor_idx
  ON silver.loc_trace (scope_id,county_id,title,uid) WHERE trace_type='anchor';

CREATE OR REPLACE FUNCTION silver.sync_scope_trace_union()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog','silver'
AS $function$
DECLARE origin text;
BEGIN
  IF TG_TABLE_SCHEMA <> 'silver' THEN
    RAISE EXCEPTION 'Unsupported trace schema';
  END IF;
  IF TG_TABLE_NAME='lo3rwang_trace' THEN origin:='lo3rwang';
  ELSIF TG_TABLE_NAME='lrunes_trace' THEN origin:='lrunes';
  ELSE RAISE EXCEPTION 'Unsupported trace source';
  END IF;
  IF TG_OP='DELETE' THEN
    DELETE FROM silver.loc_trace WHERE scope_id=origin AND uid=OLD.uid;
    RETURN OLD;
  END IF;
  INSERT INTO silver.loc_trace AS target
    (scope_id,uid,trace_type,title,description,longitude,latitude,
     radius_m,anchor_uids,created_at,times,county_id)
  VALUES
    (origin,NEW.uid,NEW.trace_type,NEW.title,NEW.description,
     NEW.longitude,NEW.latitude,NEW.radius_m,NEW.anchor_uids,
     NEW.created_at,NEW.times,NEW.county_id)
  ON CONFLICT(scope_id,uid) DO UPDATE SET
    trace_type=EXCLUDED.trace_type,
    title=EXCLUDED.title,
    description=EXCLUDED.description,
    longitude=EXCLUDED.longitude,
    latitude=EXCLUDED.latitude,
    radius_m=EXCLUDED.radius_m,
    anchor_uids=EXCLUDED.anchor_uids,
    created_at=EXCLUDED.created_at,
    times=EXCLUDED.times,
    county_id=EXCLUDED.county_id;
  RETURN NEW;
END;
$function$;
