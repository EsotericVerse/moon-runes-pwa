-- LOC Trace: complete postal address and vertical floor identity.
-- Coordinates are horizontal location evidence, never a unique business ID.
-- Existing owner Scope UIDs, ordered routes, timestamps, and RLS are unchanged.
ALTER TABLE silver.lo3rwang_trace ADD COLUMN IF NOT EXISTS address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS floor_label text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS floor_level smallint;
ALTER TABLE silver.lrunes_trace ADD COLUMN IF NOT EXISTS address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS floor_label text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS floor_level smallint;
ALTER TABLE silver.loc_trace ADD COLUMN IF NOT EXISTS address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS floor_label text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS floor_level smallint;

-- Preserve previously existing class/group, county, times, and route fields.
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
 (scope_id,uid,trace_type,title,description,longitude,latitude,radius_m,anchor_uids,
  created_at,times,county_id,"class",class_group,address,floor_label,floor_level)
 VALUES(origin,NEW.uid,NEW.trace_type,NEW.title,NEW.description,NEW.longitude,NEW.latitude,
  NEW.radius_m,NEW.anchor_uids,NEW.created_at,NEW.times,NEW.county_id,NEW."class",
  NEW.class_group,NEW.address,NEW.floor_label,NEW.floor_level)
 ON CONFLICT(scope_id,uid) DO UPDATE SET
  trace_type=EXCLUDED.trace_type,title=EXCLUDED.title,description=EXCLUDED.description,
  longitude=EXCLUDED.longitude,latitude=EXCLUDED.latitude,radius_m=EXCLUDED.radius_m,
  anchor_uids=EXCLUDED.anchor_uids,created_at=EXCLUDED.created_at,times=EXCLUDED.times,
  county_id=EXCLUDED.county_id,"class"=EXCLUDED."class",class_group=EXCLUDED.class_group,
  address=EXCLUDED.address,floor_label=EXCLUDED.floor_label,floor_level=EXCLUDED.floor_level;
 RETURN NEW;
END;
$function$;

-- Only backfill verifiable, explicitly recorded legacy postal addresses.
-- Ambiguous floor ranges are display-only; they have no single numeric floor.
WITH evidence AS (
 SELECT uid,trim((regexp_match(description,'地址[：:][[:space:]]*([^。；;\n]+)'))[1]) AS full_address
 FROM silver.lo3rwang_trace
 WHERE trace_type='anchor' AND address='' AND description ~ '地址[：:]'
)
UPDATE silver.lo3rwang_trace a SET address=e.full_address,
 floor_label=CASE
  WHEN e.full_address ~* 'B[0-9]+$' THEN upper(substring(e.full_address FROM '(B[0-9]+)$'))
  WHEN e.full_address ~ '[0-9]+[-～~–][0-9]+樓$' THEN substring(e.full_address FROM '([0-9]+[-～~–][0-9]+樓)$')
  WHEN e.full_address ~ '地下[0-9]+樓$' THEN substring(e.full_address FROM '(地下[0-9]+樓)$')
  WHEN e.full_address ~ '[0-9]+樓$' THEN substring(e.full_address FROM '([0-9]+樓)$')
  ELSE '' END,
 floor_level=CASE
  WHEN e.full_address ~* 'B[0-9]+$' THEN -substring(e.full_address FROM 'B([0-9]+)$')::smallint
  WHEN e.full_address ~ '地下[0-9]+樓$' THEN -substring(e.full_address FROM '地下([0-9]+)樓$')::smallint
  WHEN e.full_address ~ '號[0-9]+樓$' THEN substring(e.full_address FROM '([0-9]+)樓$')::smallint
  ELSE NULL END
FROM evidence e WHERE a.uid=e.uid AND e.full_address<>'';
