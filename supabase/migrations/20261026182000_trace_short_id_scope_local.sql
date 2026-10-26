-- Add a stable four-character Scope-local Trace identity without destructively
-- rewriting the existing 8-character uid/Frame Queue. Galaxy place_id references
-- trace.trace_id, not trace.uid; source_place and article uid remain unchanged.
-- Four hex digits provide 65,535 nonzero values per Scope.
ALTER TABLE silver.lo3rwang_trace ADD COLUMN IF NOT EXISTS trace_id varchar(4);
ALTER TABLE silver.lrunes_trace ADD COLUMN IF NOT EXISTS trace_id varchar(4);
ALTER TABLE silver.loc_trace ADD COLUMN IF NOT EXISTS trace_id varchar(4);

CREATE SEQUENCE IF NOT EXISTS silver.lo3rwang_trace_short_seq
  AS bigint START 1 MINVALUE 1 MAXVALUE 65535 NO CYCLE;
CREATE SEQUENCE IF NOT EXISTS silver.lrunes_trace_short_seq
  AS bigint START 1 MINVALUE 1 MAXVALUE 65535 NO CYCLE;
CREATE SEQUENCE IF NOT EXISTS silver.loc_trace_short_seq
  AS bigint START 1 MINVALUE 1 MAXVALUE 65535 NO CYCLE;

-- The existing authorized source-to-LOC mirror must copy the new public
-- identifier on INSERT and UPDATE, not manufacture a second number in LOC.
CREATE OR REPLACE FUNCTION silver.sync_scope_trace_union()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'silver'
AS $fn$
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
  (scope_id,uid,trace_id,trace_type,title,description,longitude,latitude,radius_m,
   anchor_uids,created_at,times,county_id,"class",class_group,
   address,floor_label,floor_level,category)
 VALUES
  (origin,NEW.uid,NEW.trace_id,NEW.trace_type,NEW.title,NEW.description,
   NEW.longitude,NEW.latitude,NEW.radius_m,NEW.anchor_uids,NEW.created_at,
   NEW.times,NEW.county_id,NEW."class",NEW.class_group,
   NEW.address,NEW.floor_label,NEW.floor_level,NEW.category)
 ON CONFLICT(scope_id,uid) DO UPDATE SET
   trace_id=EXCLUDED.trace_id,trace_type=EXCLUDED.trace_type,title=EXCLUDED.title,
   description=EXCLUDED.description,longitude=EXCLUDED.longitude,
   latitude=EXCLUDED.latitude,radius_m=EXCLUDED.radius_m,
   anchor_uids=EXCLUDED.anchor_uids,created_at=EXCLUDED.created_at,
   times=EXCLUDED.times,county_id=EXCLUDED.county_id,
   "class"=EXCLUDED."class",class_group=EXCLUDED.class_group,
   address=EXCLUDED.address,floor_label=EXCLUDED.floor_label,
   floor_level=EXCLUDED.floor_level,category=EXCLUDED.category;
 RETURN NEW;
END;
$fn$;

-- Deterministic old-UID mapping (ordered, unique, reversible by retaining
-- uid). No LEFT(uid,4); never touch anchor_uids or Galaxy original fields.
WITH ranked AS (
 SELECT uid, row_number() OVER(ORDER BY created_at NULLS LAST,uid) AS rank
 FROM silver.lo3rwang_trace
)
UPDATE silver.lo3rwang_trace AS t
SET trace_id=upper(lpad(to_hex(ranked.rank::integer),4,'0'))
FROM ranked WHERE t.uid=ranked.uid AND t.trace_id IS NULL;

WITH ranked AS (
 SELECT uid, row_number() OVER(ORDER BY created_at NULLS LAST,uid) AS rank
 FROM silver.lrunes_trace
)
UPDATE silver.lrunes_trace AS t
SET trace_id=upper(lpad(to_hex(ranked.rank::integer),4,'0'))
FROM ranked WHERE t.uid=ranked.uid AND t.trace_id IS NULL;

-- Native LOC anchors (if any) are distinct from the mirrored sources.
WITH ranked AS (
 SELECT uid,row_number() OVER(ORDER BY created_at NULLS LAST,uid) AS rank
 FROM silver.loc_trace WHERE scope_id='loc'
)
UPDATE silver.loc_trace AS t
SET trace_id=upper(lpad(to_hex(ranked.rank::integer),4,'0'))
FROM ranked WHERE t.scope_id='loc' AND t.uid=ranked.uid AND t.trace_id IS NULL;

-- Synchronization integrity check before constraining or publishing IDs.
DO $check$
BEGIN
 IF EXISTS(
   SELECT 1 FROM silver.lo3rwang_trace s
   LEFT JOIN silver.loc_trace u
     ON u.scope_id='lo3rwang' AND u.uid=s.uid
   WHERE u.uid IS NULL OR u.trace_id IS DISTINCT FROM s.trace_id
 ) OR EXISTS(
   SELECT 1 FROM silver.lrunes_trace s
   LEFT JOIN silver.loc_trace u
     ON u.scope_id='lrunes' AND u.uid=s.uid
   WHERE u.uid IS NULL OR u.trace_id IS DISTINCT FROM s.trace_id
 ) THEN RAISE EXCEPTION 'Trace Scope-to-LOC mirror trace_id mismatch; rolling back'; END IF;
 IF EXISTS(
   SELECT 1 FROM silver.loc_trace WHERE trace_id IS NULL OR char_length(trace_id)<>4
 ) THEN RAISE EXCEPTION 'Invalid/missing four-character trace_id; rolling back'; END IF;
END;
$check$;

SELECT setval('silver.lo3rwang_trace_short_seq',
  greatest(1,(SELECT count(*) FROM silver.lo3rwang_trace)),true);
SELECT setval('silver.lrunes_trace_short_seq',
  greatest(1,(SELECT count(*) FROM silver.lrunes_trace)),true);
SELECT setval('silver.loc_trace_short_seq',
  greatest(1,(SELECT count(*) FROM silver.loc_trace WHERE scope_id='loc')),true);

ALTER TABLE silver.lo3rwang_trace ALTER COLUMN trace_id SET DEFAULT
  upper(lpad(to_hex(nextval('silver.lo3rwang_trace_short_seq'::regclass)::int),4,'0'));
ALTER TABLE silver.lrunes_trace ALTER COLUMN trace_id SET DEFAULT
  upper(lpad(to_hex(nextval('silver.lrunes_trace_short_seq'::regclass)::int),4,'0'));
ALTER TABLE silver.loc_trace ALTER COLUMN trace_id SET DEFAULT
  upper(lpad(to_hex(nextval('silver.loc_trace_short_seq'::regclass)::int),4,'0'));

CREATE UNIQUE INDEX IF NOT EXISTS lo3rwang_trace_trace_id_uq
 ON silver.lo3rwang_trace(trace_id);
CREATE UNIQUE INDEX IF NOT EXISTS lrunes_trace_trace_id_uq
 ON silver.lrunes_trace(trace_id);
CREATE UNIQUE INDEX IF NOT EXISTS loc_trace_scope_trace_id_uq
 ON silver.loc_trace(scope_id,trace_id);

ALTER TABLE silver.lo3rwang_trace ALTER COLUMN trace_id SET NOT NULL;
ALTER TABLE silver.lrunes_trace ALTER COLUMN trace_id SET NOT NULL;
ALTER TABLE silver.loc_trace ALTER COLUMN trace_id SET NOT NULL;

-- Prevent an old client from overwriting the new permanent identity.
CREATE OR REPLACE FUNCTION silver.trace_prevent_identity_change()
RETURNS trigger LANGUAGE plpgsql
SET search_path TO 'pg_catalog','silver'
AS $fn$
BEGIN
 IF NEW.uid IS DISTINCT FROM OLD.uid
    OR NEW.trace_id IS DISTINCT FROM OLD.trace_id
    OR NEW.trace_type IS DISTINCT FROM OLD.trace_type THEN
   RAISE EXCEPTION '痕跡紀錄 UID／Trace ID 與類型不能修改；請另建紀錄。';
 END IF;
 IF TG_TABLE_SCHEMA='silver' AND TG_TABLE_NAME='loc_trace' THEN
   IF NEW.scope_id IS DISTINCT FROM OLD.scope_id THEN
     RAISE EXCEPTION '痕跡來源 Scope 不可修改。';
   END IF;
 END IF;
 RETURN NEW;
END;
$fn$;

COMMENT ON COLUMN silver.lo3rwang_trace.trace_id IS 'Four-character Scope-local stable identity referenced by Galaxy.place_id; original uid stays unchanged.';
COMMENT ON COLUMN silver.lrunes_trace.trace_id IS 'Four-character Scope-local stable identity referenced by Galaxy.place_id; original uid stays unchanged.';
COMMENT ON COLUMN silver.loc_trace.trace_id IS 'Four-character Scope-local identity with scope_id disambiguation; source Trace IDs mirrored unchanged.';
