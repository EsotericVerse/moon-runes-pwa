-- LOC A-line: ONE four-character UID per Trace row, distinguished by trace_type.
-- This is an atomic, locked, reversible identity migration. Never truncate
-- the old UID. Archive exact identity/ordered Queue mapping for rollback.
-- Deploy the matching four-character Trace client before applying this cutover.
BEGIN;
SET LOCAL lock_timeout='8s';
SET LOCAL statement_timeout='45s';
-- Retain Galaxy article UID/source_place exactly; place_id is a nullable link.
ALTER TABLE silver.lo3rwang_galaxy ADD COLUMN IF NOT EXISTS place_id varchar(4);
ALTER TABLE silver.lrunes_galaxy ADD COLUMN IF NOT EXISTS place_id varchar(4);
CREATE INDEX IF NOT EXISTS lo3rwang_galaxy_place_id_idx
 ON silver.lo3rwang_galaxy(place_id) WHERE place_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS lrunes_galaxy_place_id_idx
 ON silver.lrunes_galaxy(place_id) WHERE place_id IS NOT NULL;
LOCK TABLE silver.lo3rwang_trace,silver.lrunes_trace,silver.loc_trace
 IN ACCESS EXCLUSIVE MODE;

CREATE TABLE IF NOT EXISTS silver.trace_uid_migration_backup (
  scope_id text NOT NULL,
  old_uid text NOT NULL,
  new_uid varchar(4) NOT NULL,
  trace_type text NOT NULL,
  old_anchor_uids text[] NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now(),
  original_record jsonb,
  PRIMARY KEY(scope_id,old_uid),
  UNIQUE(scope_id,new_uid)
);
ALTER TABLE silver.trace_uid_migration_backup ADD COLUMN IF NOT EXISTS original_record jsonb;
ALTER TABLE silver.trace_uid_migration_backup ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON silver.trace_uid_migration_backup FROM PUBLIC,anon,authenticated;

-- Preserve the first exact record for each identity. Do not overwrite
-- the historical snapshot or touch Galaxy.source_place.
INSERT INTO silver.trace_uid_migration_backup
(scope_id,old_uid,new_uid,trace_type,old_anchor_uids,original_record)
 SELECT 'lo3rwang',uid,trace_id,trace_type,anchor_uids,to_jsonb(t) FROM silver.lo3rwang_trace t
 UNION ALL
 SELECT 'lrunes',uid,trace_id,trace_type,anchor_uids,to_jsonb(t) FROM silver.lrunes_trace t
 UNION ALL
 SELECT 'loc',uid,trace_id,trace_type,anchor_uids,to_jsonb(t) FROM silver.loc_trace t WHERE scope_id='loc'
ON CONFLICT (scope_id,old_uid) DO UPDATE SET
 original_record=EXCLUDED.original_record
 WHERE silver.trace_uid_migration_backup.original_record IS NULL;

DO $verify$
DECLARE n bigint;
BEGIN
 SELECT count(*) INTO n FROM (
   SELECT scope_id,uid,trace_id FROM silver.loc_trace
   WHERE trace_id IS NULL OR trace_id !~ '^[0-9A-F]{4}$'
   UNION ALL
   SELECT 'lo3rwang',uid,trace_id FROM silver.lo3rwang_trace
   WHERE trace_id IS NULL OR trace_id !~ '^[0-9A-F]{4}$'
   UNION ALL
   SELECT 'lrunes',uid,trace_id FROM silver.lrunes_trace
   WHERE trace_id IS NULL OR trace_id !~ '^[0-9A-F]{4}$'
 ) broken;
 IF n<>0 THEN RAISE EXCEPTION 'Invalid 4-character identity; migration aborted'; END IF;
 IF EXISTS (SELECT 1 FROM silver.trace_uid_migration_backup WHERE original_record IS NULL)
 THEN RAISE EXCEPTION 'Missing protected original Trace record'; END IF;
 IF (SELECT count(*) FROM silver.trace_uid_migration_backup)
   <> (SELECT count(*) FROM silver.lo3rwang_trace)
     +(SELECT count(*) FROM silver.lrunes_trace)
     +(SELECT count(*) FROM silver.loc_trace WHERE scope_id='loc')
 THEN RAISE EXCEPTION 'Legacy UID archive count mismatch'; END IF;
 IF EXISTS (
   SELECT 1 FROM silver.loc_trace a WHERE a.scope_id IN ('lo3rwang','lrunes')
     AND NOT EXISTS (
       SELECT 1 FROM silver.trace_uid_migration_backup b
       WHERE b.scope_id=a.scope_id AND b.old_uid=a.uid AND b.new_uid=a.trace_id
     )
 ) THEN RAISE EXCEPTION 'LOC union differs from source identity'; END IF;
 IF EXISTS (
   SELECT 1 FROM silver.lo3rwang_trace m
    CROSS JOIN LATERAL unnest(m.anchor_uids) x(uid)
    WHERE m.trace_type='map' AND NOT EXISTS
      (SELECT 1 FROM silver.lo3rwang_trace a WHERE a.uid=x.uid AND a.trace_type='anchor')
 ) THEN RAISE EXCEPTION 'Orphan anchor in Frame Queue'; END IF;
 IF EXISTS (
   SELECT 1 FROM silver.lrunes_trace m
    CROSS JOIN LATERAL unnest(m.anchor_uids) x(uid)
    WHERE m.trace_type='map' AND NOT EXISTS
      (SELECT 1 FROM silver.lrunes_trace a WHERE a.uid=x.uid AND a.trace_type='anchor')
 ) THEN RAISE EXCEPTION 'Orphan anchor in Frame Queue (lrunes)'; END IF;
 IF EXISTS(
   SELECT 1 FROM silver.lo3rwang_galaxy WHERE place_id IS NOT NULL
 ) OR EXISTS(
   SELECT 1 FROM silver.lrunes_galaxy WHERE place_id IS NOT NULL
 ) THEN RAISE EXCEPTION 'Existing article links must be audited before cutover'; END IF;
END
$verify$;

-- All old-object identifiers change together. While the tables are locked,
-- disable only their existing USER triggers, not database-level constraints.
ALTER TABLE silver.lo3rwang_trace DISABLE TRIGGER USER;
ALTER TABLE silver.lrunes_trace DISABLE TRIGGER USER;
ALTER TABLE silver.loc_trace DISABLE TRIGGER USER;

ALTER TABLE silver.lo3rwang_trace DROP CONSTRAINT lo3rwang_trace_uid_check;
ALTER TABLE silver.lrunes_trace DROP CONSTRAINT lrunes_trace_uid_check;
ALTER TABLE silver.loc_trace DROP CONSTRAINT loc_trace_uid_check;

UPDATE silver.lo3rwang_trace a SET uid=b.new_uid
 FROM silver.trace_uid_migration_backup b
 WHERE b.scope_id='lo3rwang' AND a.uid=b.old_uid;
UPDATE silver.lrunes_trace a SET uid=b.new_uid
 FROM silver.trace_uid_migration_backup b
 WHERE b.scope_id='lrunes' AND a.uid=b.old_uid;
UPDATE silver.loc_trace a SET uid=b.new_uid
 FROM silver.trace_uid_migration_backup b
 WHERE b.scope_id=a.scope_id AND a.uid=b.old_uid;

UPDATE silver.lo3rwang_trace m
 SET anchor_uids=(
   SELECT array_agg(b.new_uid::text ORDER BY x.ord)
   FROM unnest(m.anchor_uids) WITH ORDINALITY x(uid,ord)
   JOIN silver.trace_uid_migration_backup b
     ON b.scope_id='lo3rwang' AND b.old_uid=x.uid)
 WHERE m.trace_type='map';
UPDATE silver.lrunes_trace m
 SET anchor_uids=(
   SELECT array_agg(b.new_uid::text ORDER BY x.ord)
   FROM unnest(m.anchor_uids) WITH ORDINALITY x(uid,ord)
   JOIN silver.trace_uid_migration_backup b
     ON b.scope_id='lrunes' AND b.old_uid=x.uid)
 WHERE m.trace_type='map';
UPDATE silver.loc_trace m
 SET anchor_uids=(
   SELECT array_agg(b.new_uid::text ORDER BY x.ord)
   FROM unnest(m.anchor_uids) WITH ORDINALITY x(uid,ord)
   JOIN silver.trace_uid_migration_backup b
     ON b.scope_id=m.scope_id AND b.old_uid=x.uid)
 WHERE m.trace_type='map';

ALTER TABLE silver.lo3rwang_trace ALTER COLUMN uid TYPE varchar(4);
ALTER TABLE silver.lrunes_trace ALTER COLUMN uid TYPE varchar(4);
ALTER TABLE silver.loc_trace ALTER COLUMN uid TYPE varchar(4);

ALTER TABLE silver.lo3rwang_trace
 ADD CONSTRAINT lo3rwang_trace_uid_check CHECK(uid ~ '^[A-Za-z0-9]{4}
ALTER TABLE silver.lrunes_trace
 ADD CONSTRAINT lrunes_trace_uid_check CHECK(uid ~ '^[A-Za-z0-9]{4}
ALTER TABLE silver.loc_trace
 ADD CONSTRAINT loc_trace_uid_check CHECK(uid ~ '^[A-Za-z0-9]{4}

-- Reuse the existing Scope-local sequences, one per source, now as UID defaults.
ALTER TABLE silver.lo3rwang_trace ALTER COLUMN uid SET DEFAULT
 upper(lpad(to_hex(nextval('silver.lo3rwang_trace_short_seq'::regclass)::integer),4,'0'));
ALTER TABLE silver.lrunes_trace ALTER COLUMN uid SET DEFAULT
 upper(lpad(to_hex(nextval('silver.lrunes_trace_short_seq'::regclass)::integer),4,'0'));
ALTER TABLE silver.loc_trace ALTER COLUMN uid SET DEFAULT
 upper(lpad(to_hex(nextval('silver.loc_trace_short_seq'::regclass)::integer),4,'0'));
GRANT USAGE ON SEQUENCE silver.lo3rwang_trace_short_seq,
 silver.lrunes_trace_short_seq,silver.loc_trace_short_seq TO authenticated;

-- The LOC union retains its (scope_id,uid) primary key; no global UID.
CREATE OR REPLACE FUNCTION silver.sync_scope_trace_union()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','silver' AS $fn$
DECLARE origin text;
BEGIN
 IF TG_TABLE_SCHEMA <> 'silver' THEN RAISE EXCEPTION 'Unsupported Trace source'; END IF;
 IF TG_TABLE_NAME='lo3rwang_trace' THEN origin:='lo3rwang';
 ELSIF TG_TABLE_NAME='lrunes_trace' THEN origin:='lrunes';
 ELSE RAISE EXCEPTION 'Unsupported Trace source'; END IF;
 IF TG_OP='DELETE' THEN
   DELETE FROM silver.loc_trace WHERE scope_id=origin AND uid=OLD.uid;
   RETURN OLD;
 END IF;
 INSERT INTO silver.loc_trace AS target
 (scope_id,uid,trace_type,title,description,longitude,latitude,radius_m,
  anchor_uids,created_at,times,county_id,"class",class_group,
  address,floor_label,floor_level,category)
 VALUES
 (origin,NEW.uid,NEW.trace_type,NEW.title,NEW.description,NEW.longitude,
  NEW.latitude,NEW.radius_m,NEW.anchor_uids,NEW.created_at,NEW.times,
  NEW.county_id,NEW."class",NEW.class_group,NEW.address,NEW.floor_label,
  NEW.floor_level,NEW.category)
 ON CONFLICT(scope_id,uid) DO UPDATE SET
 trace_type=excluded.trace_type,title=excluded.title,
 description=excluded.description,longitude=excluded.longitude,
 latitude=excluded.latitude,radius_m=excluded.radius_m,
 anchor_uids=excluded.anchor_uids,created_at=excluded.created_at,
 times=excluded.times,county_id=excluded.county_id,
 "class"=excluded."class",class_group=excluded.class_group,
 address=excluded.address,floor_label=excluded.floor_label,
 floor_level=excluded.floor_level,category=excluded.category;
 RETURN NEW;
END
$fn$;

CREATE OR REPLACE FUNCTION silver.trace_prevent_identity_change()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'pg_catalog','silver' AS $fn$
BEGIN
 IF NEW.uid IS DISTINCT FROM OLD.uid OR NEW.trace_type IS DISTINCT FROM OLD.trace_type THEN
   RAISE EXCEPTION '痕跡 UID／類型不可修改；請另建紀錄。';
 END IF;
 IF TG_TABLE_NAME='loc_trace' AND NEW.scope_id IS DISTINCT FROM OLD.scope_id THEN
   RAISE EXCEPTION '來源 Scope 不能變更';
 END IF;
 RETURN NEW;
END
$fn$;

-- Keep the existing reviewed merge routine, changing only its 8-char validation.
DO $adapt$
DECLARE definition text;
BEGIN
 SELECT pg_get_functiondef(p.oid) INTO definition
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='silver' AND p.proname='merge_scoped_trace_anchors';
 IF definition IS NULL OR position('^[A-Za-z0-9]{8}$' in definition)=0
 THEN RAISE EXCEPTION 'Unexpected merge function; do not guess migration'; END IF;
 EXECUTE replace(definition,'^[A-Za-z0-9]{8}$','^[0-9A-F]{4}$');
END
$adapt$;

-- Rename the accidental extra identity of the alias table before rewriting its
-- corresponding RPC. This is metadata only; no articles or anchors are deleted.
ALTER TABLE silver.trace_place_alias RENAME COLUMN trace_id TO anchor_uid;

-- Rewrite the reconciler RPCs in the companion migration before dropping the
-- accidental second-ID column. The companion is intended for the same release.
ALTER TABLE silver.lo3rwang_trace ENABLE TRIGGER USER;
ALTER TABLE silver.lrunes_trace ENABLE TRIGGER USER;
ALTER TABLE silver.loc_trace ENABLE TRIGGER USER;

DO $verify$
BEGIN
 IF EXISTS (
   SELECT 1 FROM silver.lo3rwang_trace s
   LEFT JOIN silver.loc_trace l ON l.scope_id='lo3rwang' AND l.uid=s.uid
   WHERE l.uid IS NULL OR s.trace_type<>l.trace_type
 ) OR EXISTS (
   SELECT 1 FROM silver.lrunes_trace s
   LEFT JOIN silver.loc_trace l ON l.scope_id='lrunes' AND l.uid=s.uid
   WHERE l.uid IS NULL OR s.trace_type<>l.trace_type
 ) THEN RAISE EXCEPTION 'Post-cutover LOC union mismatch'; END IF;
 IF EXISTS (
  SELECT 1 FROM silver.lo3rwang_trace m CROSS JOIN LATERAL unnest(m.anchor_uids) x(uid)
  WHERE m.trace_type='map' AND NOT EXISTS (
    SELECT 1 FROM silver.lo3rwang_trace a WHERE a.uid=x.uid AND a.trace_type='anchor')
 ) THEN RAISE EXCEPTION 'Queue corrupted by migration'; END IF;
 IF EXISTS (
   SELECT 1 FROM silver.lo3rwang_trace s
   JOIN silver.trace_uid_migration_backup b
     ON b.scope_id='lo3rwang' AND s.uid=b.new_uid
   WHERE s.trace_type<>b.trace_type
      OR cardinality(s.anchor_uids)<>cardinality(b.old_anchor_uids)
 ) THEN RAISE EXCEPTION 'Type or ordered Queue cardinality changed'; END IF;
 IF EXISTS (
   SELECT 1 FROM silver.lo3rwang_trace m
   JOIN silver.trace_uid_migration_backup original
     ON original.scope_id='lo3rwang' AND original.new_uid=m.uid
   WHERE m.trace_type='map' AND m.anchor_uids IS DISTINCT FROM (
     SELECT array_agg(resolved.new_uid::text ORDER BY old.ord)
     FROM unnest(original.old_anchor_uids) WITH ORDINALITY old(uid,ord)
     JOIN silver.trace_uid_migration_backup resolved
       ON resolved.scope_id='lo3rwang' AND resolved.old_uid=old.uid
   )
 ) OR EXISTS (
   SELECT 1 FROM silver.loc_trace m
   JOIN silver.trace_uid_migration_backup original
     ON original.scope_id=m.scope_id AND original.new_uid=m.uid
   WHERE m.trace_type='map' AND m.anchor_uids IS DISTINCT FROM (
     SELECT array_agg(resolved.new_uid::text ORDER BY old.ord)
     FROM unnest(original.old_anchor_uids) WITH ORDINALITY old(uid,ord)
     JOIN silver.trace_uid_migration_backup resolved
       ON resolved.scope_id=m.scope_id AND resolved.old_uid=old.uid
   )
 ) THEN RAISE EXCEPTION 'Frame Queue order or membership changed'; END IF;
END
$verify$;

-- These still hold 582 temporary values. The live application must stop
-- using the old alias RPCs before physically removing this wrong column.
-- Final schema cleanup is a separate audited post-client release step.
COMMIT;
);
ALTER TABLE silver.lrunes_trace
 ADD CONSTRAINT lrunes_trace_uid_check CHECK(uid ~ '^[0-9A-F]{4}$');
ALTER TABLE silver.loc_trace
 ADD CONSTRAINT loc_trace_uid_check CHECK(uid ~ '^[0-9A-F]{4}$');

-- Reuse the existing Scope-local sequences, one per source, now as UID defaults.
ALTER TABLE silver.lo3rwang_trace ALTER COLUMN uid SET DEFAULT
 upper(lpad(to_hex(nextval('silver.lo3rwang_trace_short_seq'::regclass)::integer),4,'0'));
ALTER TABLE silver.lrunes_trace ALTER COLUMN uid SET DEFAULT
 upper(lpad(to_hex(nextval('silver.lrunes_trace_short_seq'::regclass)::integer),4,'0'));
ALTER TABLE silver.loc_trace ALTER COLUMN uid SET DEFAULT
 upper(lpad(to_hex(nextval('silver.loc_trace_short_seq'::regclass)::integer),4,'0'));
GRANT USAGE ON SEQUENCE silver.lo3rwang_trace_short_seq,
 silver.lrunes_trace_short_seq,silver.loc_trace_short_seq TO authenticated;

-- The LOC union retains its (scope_id,uid) primary key; no global UID.
CREATE OR REPLACE FUNCTION silver.sync_scope_trace_union()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','silver' AS $fn$
DECLARE origin text;
BEGIN
 IF TG_TABLE_SCHEMA <> 'silver' THEN RAISE EXCEPTION 'Unsupported Trace source'; END IF;
 IF TG_TABLE_NAME='lo3rwang_trace' THEN origin:='lo3rwang';
 ELSIF TG_TABLE_NAME='lrunes_trace' THEN origin:='lrunes';
 ELSE RAISE EXCEPTION 'Unsupported Trace source'; END IF;
 IF TG_OP='DELETE' THEN
   DELETE FROM silver.loc_trace WHERE scope_id=origin AND uid=OLD.uid;
   RETURN OLD;
 END IF;
 INSERT INTO silver.loc_trace AS target
 (scope_id,uid,trace_type,title,description,longitude,latitude,radius_m,
  anchor_uids,created_at,times,county_id,"class",class_group,
  address,floor_label,floor_level,category)
 VALUES
 (origin,NEW.uid,NEW.trace_type,NEW.title,NEW.description,NEW.longitude,
  NEW.latitude,NEW.radius_m,NEW.anchor_uids,NEW.created_at,NEW.times,
  NEW.county_id,NEW."class",NEW.class_group,NEW.address,NEW.floor_label,
  NEW.floor_level,NEW.category)
 ON CONFLICT(scope_id,uid) DO UPDATE SET
 trace_type=excluded.trace_type,title=excluded.title,
 description=excluded.description,longitude=excluded.longitude,
 latitude=excluded.latitude,radius_m=excluded.radius_m,
 anchor_uids=excluded.anchor_uids,created_at=excluded.created_at,
 times=excluded.times,county_id=excluded.county_id,
 "class"=excluded."class",class_group=excluded.class_group,
 address=excluded.address,floor_label=excluded.floor_label,
 floor_level=excluded.floor_level,category=excluded.category;
 RETURN NEW;
END
$fn$;

CREATE OR REPLACE FUNCTION silver.trace_prevent_identity_change()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'pg_catalog','silver' AS $fn$
BEGIN
 IF NEW.uid IS DISTINCT FROM OLD.uid OR NEW.trace_type IS DISTINCT FROM OLD.trace_type THEN
   RAISE EXCEPTION '痕跡 UID／類型不可修改；請另建紀錄。';
 END IF;
 IF TG_TABLE_NAME='loc_trace' AND NEW.scope_id IS DISTINCT FROM OLD.scope_id THEN
   RAISE EXCEPTION '來源 Scope 不能變更';
 END IF;
 RETURN NEW;
END
$fn$;

-- Keep the existing reviewed merge routine, changing only its 8-char validation.
DO $adapt$
DECLARE definition text;
BEGIN
 SELECT pg_get_functiondef(p.oid) INTO definition
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='silver' AND p.proname='merge_scoped_trace_anchors';
 IF definition IS NULL OR position('^[A-Za-z0-9]{8}$' in definition)=0
 THEN RAISE EXCEPTION 'Unexpected merge function; do not guess migration'; END IF;
 EXECUTE replace(definition,'^[A-Za-z0-9]{8}$','^[0-9A-F]{4}$');
END
$adapt$;

-- Rename the accidental extra identity of the alias table before rewriting its
-- corresponding RPC. This is metadata only; no articles or anchors are deleted.
ALTER TABLE silver.trace_place_alias RENAME COLUMN trace_id TO anchor_uid;

-- Rewrite the reconciler RPCs in the companion migration before dropping the
-- accidental second-ID column. The companion is intended for the same release.
ALTER TABLE silver.lo3rwang_trace ENABLE TRIGGER USER;
ALTER TABLE silver.lrunes_trace ENABLE TRIGGER USER;
ALTER TABLE silver.loc_trace ENABLE TRIGGER USER;

DO $verify$
BEGIN
 IF EXISTS (
   SELECT 1 FROM silver.lo3rwang_trace s
   LEFT JOIN silver.loc_trace l ON l.scope_id='lo3rwang' AND l.uid=s.uid
   WHERE l.uid IS NULL OR s.trace_type<>l.trace_type
 ) OR EXISTS (
   SELECT 1 FROM silver.lrunes_trace s
   LEFT JOIN silver.loc_trace l ON l.scope_id='lrunes' AND l.uid=s.uid
   WHERE l.uid IS NULL OR s.trace_type<>l.trace_type
 ) THEN RAISE EXCEPTION 'Post-cutover LOC union mismatch'; END IF;
 IF EXISTS (
  SELECT 1 FROM silver.lo3rwang_trace m CROSS JOIN LATERAL unnest(m.anchor_uids) x(uid)
  WHERE m.trace_type='map' AND NOT EXISTS (
    SELECT 1 FROM silver.lo3rwang_trace a WHERE a.uid=x.uid AND a.trace_type='anchor')
 ) THEN RAISE EXCEPTION 'Queue corrupted by migration'; END IF;
 IF EXISTS (
   SELECT 1 FROM silver.lo3rwang_trace s
   JOIN silver.trace_uid_migration_backup b
     ON b.scope_id='lo3rwang' AND s.uid=b.new_uid
   WHERE s.trace_type<>b.trace_type
      OR cardinality(s.anchor_uids)<>cardinality(b.old_anchor_uids)
 ) THEN RAISE EXCEPTION 'Type or ordered Queue cardinality changed'; END IF;
 IF EXISTS (
   SELECT 1 FROM silver.lo3rwang_trace m
   JOIN silver.trace_uid_migration_backup original
     ON original.scope_id='lo3rwang' AND original.new_uid=m.uid
   WHERE m.trace_type='map' AND m.anchor_uids IS DISTINCT FROM (
     SELECT array_agg(resolved.new_uid::text ORDER BY old.ord)
     FROM unnest(original.old_anchor_uids) WITH ORDINALITY old(uid,ord)
     JOIN silver.trace_uid_migration_backup resolved
       ON resolved.scope_id='lo3rwang' AND resolved.old_uid=old.uid
   )
 ) OR EXISTS (
   SELECT 1 FROM silver.loc_trace m
   JOIN silver.trace_uid_migration_backup original
     ON original.scope_id=m.scope_id AND original.new_uid=m.uid
   WHERE m.trace_type='map' AND m.anchor_uids IS DISTINCT FROM (
     SELECT array_agg(resolved.new_uid::text ORDER BY old.ord)
     FROM unnest(original.old_anchor_uids) WITH ORDINALITY old(uid,ord)
     JOIN silver.trace_uid_migration_backup resolved
       ON resolved.scope_id=m.scope_id AND resolved.old_uid=old.uid
   )
 ) THEN RAISE EXCEPTION 'Frame Queue order or membership changed'; END IF;
END
$verify$;

-- These still hold 582 temporary values. The live application must stop
-- using the old alias RPCs before physically removing this wrong column.
-- Final schema cleanup is a separate audited post-client release step.
COMMIT;
);
ALTER TABLE silver.loc_trace
 ADD CONSTRAINT loc_trace_uid_check CHECK(uid ~ '^[0-9A-F]{4}$');

-- Reuse the existing Scope-local sequences, one per source, now as UID defaults.
ALTER TABLE silver.lo3rwang_trace ALTER COLUMN uid SET DEFAULT
 upper(lpad(to_hex(nextval('silver.lo3rwang_trace_short_seq'::regclass)::integer),4,'0'));
ALTER TABLE silver.lrunes_trace ALTER COLUMN uid SET DEFAULT
 upper(lpad(to_hex(nextval('silver.lrunes_trace_short_seq'::regclass)::integer),4,'0'));
ALTER TABLE silver.loc_trace ALTER COLUMN uid SET DEFAULT
 upper(lpad(to_hex(nextval('silver.loc_trace_short_seq'::regclass)::integer),4,'0'));
GRANT USAGE ON SEQUENCE silver.lo3rwang_trace_short_seq,
 silver.lrunes_trace_short_seq,silver.loc_trace_short_seq TO authenticated;

-- The LOC union retains its (scope_id,uid) primary key; no global UID.
CREATE OR REPLACE FUNCTION silver.sync_scope_trace_union()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','silver' AS $fn$
DECLARE origin text;
BEGIN
 IF TG_TABLE_SCHEMA <> 'silver' THEN RAISE EXCEPTION 'Unsupported Trace source'; END IF;
 IF TG_TABLE_NAME='lo3rwang_trace' THEN origin:='lo3rwang';
 ELSIF TG_TABLE_NAME='lrunes_trace' THEN origin:='lrunes';
 ELSE RAISE EXCEPTION 'Unsupported Trace source'; END IF;
 IF TG_OP='DELETE' THEN
   DELETE FROM silver.loc_trace WHERE scope_id=origin AND uid=OLD.uid;
   RETURN OLD;
 END IF;
 INSERT INTO silver.loc_trace AS target
 (scope_id,uid,trace_type,title,description,longitude,latitude,radius_m,
  anchor_uids,created_at,times,county_id,"class",class_group,
  address,floor_label,floor_level,category)
 VALUES
 (origin,NEW.uid,NEW.trace_type,NEW.title,NEW.description,NEW.longitude,
  NEW.latitude,NEW.radius_m,NEW.anchor_uids,NEW.created_at,NEW.times,
  NEW.county_id,NEW."class",NEW.class_group,NEW.address,NEW.floor_label,
  NEW.floor_level,NEW.category)
 ON CONFLICT(scope_id,uid) DO UPDATE SET
 trace_type=excluded.trace_type,title=excluded.title,
 description=excluded.description,longitude=excluded.longitude,
 latitude=excluded.latitude,radius_m=excluded.radius_m,
 anchor_uids=excluded.anchor_uids,created_at=excluded.created_at,
 times=excluded.times,county_id=excluded.county_id,
 "class"=excluded."class",class_group=excluded.class_group,
 address=excluded.address,floor_label=excluded.floor_label,
 floor_level=excluded.floor_level,category=excluded.category;
 RETURN NEW;
END
$fn$;

CREATE OR REPLACE FUNCTION silver.trace_prevent_identity_change()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'pg_catalog','silver' AS $fn$
BEGIN
 IF NEW.uid IS DISTINCT FROM OLD.uid OR NEW.trace_type IS DISTINCT FROM OLD.trace_type THEN
   RAISE EXCEPTION '痕跡 UID／類型不可修改；請另建紀錄。';
 END IF;
 IF TG_TABLE_NAME='loc_trace' AND NEW.scope_id IS DISTINCT FROM OLD.scope_id THEN
   RAISE EXCEPTION '來源 Scope 不能變更';
 END IF;
 RETURN NEW;
END
$fn$;

-- Keep the existing reviewed merge routine, changing only its 8-char validation.
DO $adapt$
DECLARE definition text;
BEGIN
 SELECT pg_get_functiondef(p.oid) INTO definition
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='silver' AND p.proname='merge_scoped_trace_anchors';
 IF definition IS NULL OR position('^[A-Za-z0-9]{8}$' in definition)=0
 THEN RAISE EXCEPTION 'Unexpected merge function; do not guess migration'; END IF;
 EXECUTE replace(definition,'^[A-Za-z0-9]{8}$','^[0-9A-F]{4}$');
END
$adapt$;

-- Rename the accidental extra identity of the alias table before rewriting its
-- corresponding RPC. This is metadata only; no articles or anchors are deleted.
ALTER TABLE silver.trace_place_alias RENAME COLUMN trace_id TO anchor_uid;

-- Rewrite the reconciler RPCs in the companion migration before dropping the
-- accidental second-ID column. The companion is intended for the same release.
ALTER TABLE silver.lo3rwang_trace ENABLE TRIGGER USER;
ALTER TABLE silver.lrunes_trace ENABLE TRIGGER USER;
ALTER TABLE silver.loc_trace ENABLE TRIGGER USER;

DO $verify$
BEGIN
 IF EXISTS (
   SELECT 1 FROM silver.lo3rwang_trace s
   LEFT JOIN silver.loc_trace l ON l.scope_id='lo3rwang' AND l.uid=s.uid
   WHERE l.uid IS NULL OR s.trace_type<>l.trace_type
 ) OR EXISTS (
   SELECT 1 FROM silver.lrunes_trace s
   LEFT JOIN silver.loc_trace l ON l.scope_id='lrunes' AND l.uid=s.uid
   WHERE l.uid IS NULL OR s.trace_type<>l.trace_type
 ) THEN RAISE EXCEPTION 'Post-cutover LOC union mismatch'; END IF;
 IF EXISTS (
  SELECT 1 FROM silver.lo3rwang_trace m CROSS JOIN LATERAL unnest(m.anchor_uids) x(uid)
  WHERE m.trace_type='map' AND NOT EXISTS (
    SELECT 1 FROM silver.lo3rwang_trace a WHERE a.uid=x.uid AND a.trace_type='anchor')
 ) THEN RAISE EXCEPTION 'Queue corrupted by migration'; END IF;
 IF EXISTS (
   SELECT 1 FROM silver.lo3rwang_trace s
   JOIN silver.trace_uid_migration_backup b
     ON b.scope_id='lo3rwang' AND s.uid=b.new_uid
   WHERE s.trace_type<>b.trace_type
      OR cardinality(s.anchor_uids)<>cardinality(b.old_anchor_uids)
 ) THEN RAISE EXCEPTION 'Type or ordered Queue cardinality changed'; END IF;
 IF EXISTS (
   SELECT 1 FROM silver.lo3rwang_trace m
   JOIN silver.trace_uid_migration_backup original
     ON original.scope_id='lo3rwang' AND original.new_uid=m.uid
   WHERE m.trace_type='map' AND m.anchor_uids IS DISTINCT FROM (
     SELECT array_agg(resolved.new_uid::text ORDER BY old.ord)
     FROM unnest(original.old_anchor_uids) WITH ORDINALITY old(uid,ord)
     JOIN silver.trace_uid_migration_backup resolved
       ON resolved.scope_id='lo3rwang' AND resolved.old_uid=old.uid
   )
 ) OR EXISTS (
   SELECT 1 FROM silver.loc_trace m
   JOIN silver.trace_uid_migration_backup original
     ON original.scope_id=m.scope_id AND original.new_uid=m.uid
   WHERE m.trace_type='map' AND m.anchor_uids IS DISTINCT FROM (
     SELECT array_agg(resolved.new_uid::text ORDER BY old.ord)
     FROM unnest(original.old_anchor_uids) WITH ORDINALITY old(uid,ord)
     JOIN silver.trace_uid_migration_backup resolved
       ON resolved.scope_id=m.scope_id AND resolved.old_uid=old.uid
   )
 ) THEN RAISE EXCEPTION 'Frame Queue order or membership changed'; END IF;
END
$verify$;

-- These still hold 582 temporary values. The live application must stop
-- using the old alias RPCs before physically removing this wrong column.
-- Final schema cleanup is a separate audited post-client release step.
COMMIT;
);
ALTER TABLE silver.lrunes_trace
 ADD CONSTRAINT lrunes_trace_uid_check CHECK(uid ~ '^[0-9A-F]{4}$');
ALTER TABLE silver.loc_trace
 ADD CONSTRAINT loc_trace_uid_check CHECK(uid ~ '^[0-9A-F]{4}$');

-- Reuse the existing Scope-local sequences, one per source, now as UID defaults.
ALTER TABLE silver.lo3rwang_trace ALTER COLUMN uid SET DEFAULT
 upper(lpad(to_hex(nextval('silver.lo3rwang_trace_short_seq'::regclass)::integer),4,'0'));
ALTER TABLE silver.lrunes_trace ALTER COLUMN uid SET DEFAULT
 upper(lpad(to_hex(nextval('silver.lrunes_trace_short_seq'::regclass)::integer),4,'0'));
ALTER TABLE silver.loc_trace ALTER COLUMN uid SET DEFAULT
 upper(lpad(to_hex(nextval('silver.loc_trace_short_seq'::regclass)::integer),4,'0'));
GRANT USAGE ON SEQUENCE silver.lo3rwang_trace_short_seq,
 silver.lrunes_trace_short_seq,silver.loc_trace_short_seq TO authenticated;

-- The LOC union retains its (scope_id,uid) primary key; no global UID.
CREATE OR REPLACE FUNCTION silver.sync_scope_trace_union()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','silver' AS $fn$
DECLARE origin text;
BEGIN
 IF TG_TABLE_SCHEMA <> 'silver' THEN RAISE EXCEPTION 'Unsupported Trace source'; END IF;
 IF TG_TABLE_NAME='lo3rwang_trace' THEN origin:='lo3rwang';
 ELSIF TG_TABLE_NAME='lrunes_trace' THEN origin:='lrunes';
 ELSE RAISE EXCEPTION 'Unsupported Trace source'; END IF;
 IF TG_OP='DELETE' THEN
   DELETE FROM silver.loc_trace WHERE scope_id=origin AND uid=OLD.uid;
   RETURN OLD;
 END IF;
 INSERT INTO silver.loc_trace AS target
 (scope_id,uid,trace_type,title,description,longitude,latitude,radius_m,
  anchor_uids,created_at,times,county_id,"class",class_group,
  address,floor_label,floor_level,category)
 VALUES
 (origin,NEW.uid,NEW.trace_type,NEW.title,NEW.description,NEW.longitude,
  NEW.latitude,NEW.radius_m,NEW.anchor_uids,NEW.created_at,NEW.times,
  NEW.county_id,NEW."class",NEW.class_group,NEW.address,NEW.floor_label,
  NEW.floor_level,NEW.category)
 ON CONFLICT(scope_id,uid) DO UPDATE SET
 trace_type=excluded.trace_type,title=excluded.title,
 description=excluded.description,longitude=excluded.longitude,
 latitude=excluded.latitude,radius_m=excluded.radius_m,
 anchor_uids=excluded.anchor_uids,created_at=excluded.created_at,
 times=excluded.times,county_id=excluded.county_id,
 "class"=excluded."class",class_group=excluded.class_group,
 address=excluded.address,floor_label=excluded.floor_label,
 floor_level=excluded.floor_level,category=excluded.category;
 RETURN NEW;
END
$fn$;

CREATE OR REPLACE FUNCTION silver.trace_prevent_identity_change()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'pg_catalog','silver' AS $fn$
BEGIN
 IF NEW.uid IS DISTINCT FROM OLD.uid OR NEW.trace_type IS DISTINCT FROM OLD.trace_type THEN
   RAISE EXCEPTION '痕跡 UID／類型不可修改；請另建紀錄。';
 END IF;
 IF TG_TABLE_NAME='loc_trace' AND NEW.scope_id IS DISTINCT FROM OLD.scope_id THEN
   RAISE EXCEPTION '來源 Scope 不能變更';
 END IF;
 RETURN NEW;
END
$fn$;

-- Keep the existing reviewed merge routine, changing only its 8-char validation.
DO $adapt$
DECLARE definition text;
BEGIN
 SELECT pg_get_functiondef(p.oid) INTO definition
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='silver' AND p.proname='merge_scoped_trace_anchors';
 IF definition IS NULL OR position('^[A-Za-z0-9]{8}$' in definition)=0
 THEN RAISE EXCEPTION 'Unexpected merge function; do not guess migration'; END IF;
 EXECUTE replace(definition,'^[A-Za-z0-9]{8}$','^[0-9A-F]{4}$');
END
$adapt$;

-- Rename the accidental extra identity of the alias table before rewriting its
-- corresponding RPC. This is metadata only; no articles or anchors are deleted.
ALTER TABLE silver.trace_place_alias RENAME COLUMN trace_id TO anchor_uid;

-- Rewrite the reconciler RPCs in the companion migration before dropping the
-- accidental second-ID column. The companion is intended for the same release.
ALTER TABLE silver.lo3rwang_trace ENABLE TRIGGER USER;
ALTER TABLE silver.lrunes_trace ENABLE TRIGGER USER;
ALTER TABLE silver.loc_trace ENABLE TRIGGER USER;

DO $verify$
BEGIN
 IF EXISTS (
   SELECT 1 FROM silver.lo3rwang_trace s
   LEFT JOIN silver.loc_trace l ON l.scope_id='lo3rwang' AND l.uid=s.uid
   WHERE l.uid IS NULL OR s.trace_type<>l.trace_type
 ) OR EXISTS (
   SELECT 1 FROM silver.lrunes_trace s
   LEFT JOIN silver.loc_trace l ON l.scope_id='lrunes' AND l.uid=s.uid
   WHERE l.uid IS NULL OR s.trace_type<>l.trace_type
 ) THEN RAISE EXCEPTION 'Post-cutover LOC union mismatch'; END IF;
 IF EXISTS (
  SELECT 1 FROM silver.lo3rwang_trace m CROSS JOIN LATERAL unnest(m.anchor_uids) x(uid)
  WHERE m.trace_type='map' AND NOT EXISTS (
    SELECT 1 FROM silver.lo3rwang_trace a WHERE a.uid=x.uid AND a.trace_type='anchor')
 ) THEN RAISE EXCEPTION 'Queue corrupted by migration'; END IF;
 IF EXISTS (
   SELECT 1 FROM silver.lo3rwang_trace s
   JOIN silver.trace_uid_migration_backup b
     ON b.scope_id='lo3rwang' AND s.uid=b.new_uid
   WHERE s.trace_type<>b.trace_type
      OR cardinality(s.anchor_uids)<>cardinality(b.old_anchor_uids)
 ) THEN RAISE EXCEPTION 'Type or ordered Queue cardinality changed'; END IF;
 IF EXISTS (
   SELECT 1 FROM silver.lo3rwang_trace m
   JOIN silver.trace_uid_migration_backup original
     ON original.scope_id='lo3rwang' AND original.new_uid=m.uid
   WHERE m.trace_type='map' AND m.anchor_uids IS DISTINCT FROM (
     SELECT array_agg(resolved.new_uid::text ORDER BY old.ord)
     FROM unnest(original.old_anchor_uids) WITH ORDINALITY old(uid,ord)
     JOIN silver.trace_uid_migration_backup resolved
       ON resolved.scope_id='lo3rwang' AND resolved.old_uid=old.uid
   )
 ) OR EXISTS (
   SELECT 1 FROM silver.loc_trace m
   JOIN silver.trace_uid_migration_backup original
     ON original.scope_id=m.scope_id AND original.new_uid=m.uid
   WHERE m.trace_type='map' AND m.anchor_uids IS DISTINCT FROM (
     SELECT array_agg(resolved.new_uid::text ORDER BY old.ord)
     FROM unnest(original.old_anchor_uids) WITH ORDINALITY old(uid,ord)
     JOIN silver.trace_uid_migration_backup resolved
       ON resolved.scope_id=m.scope_id AND resolved.old_uid=old.uid
   )
 ) THEN RAISE EXCEPTION 'Frame Queue order or membership changed'; END IF;
END
$verify$;

-- These still hold 582 temporary values. The live application must stop
-- using the old alias RPCs before physically removing this wrong column.
-- Final schema cleanup is a separate audited post-client release step.
COMMIT;
);

-- Reuse the existing Scope-local sequences, one per source, now as UID defaults.
ALTER TABLE silver.lo3rwang_trace ALTER COLUMN uid SET DEFAULT
 upper(lpad(to_hex(nextval('silver.lo3rwang_trace_short_seq'::regclass)::integer),4,'0'));
ALTER TABLE silver.lrunes_trace ALTER COLUMN uid SET DEFAULT
 upper(lpad(to_hex(nextval('silver.lrunes_trace_short_seq'::regclass)::integer),4,'0'));
ALTER TABLE silver.loc_trace ALTER COLUMN uid SET DEFAULT
 upper(lpad(to_hex(nextval('silver.loc_trace_short_seq'::regclass)::integer),4,'0'));
GRANT USAGE ON SEQUENCE silver.lo3rwang_trace_short_seq,
 silver.lrunes_trace_short_seq,silver.loc_trace_short_seq TO authenticated;

-- The LOC union retains its (scope_id,uid) primary key; no global UID.
CREATE OR REPLACE FUNCTION silver.sync_scope_trace_union()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','silver' AS $fn$
DECLARE origin text;
BEGIN
 IF TG_TABLE_SCHEMA <> 'silver' THEN RAISE EXCEPTION 'Unsupported Trace source'; END IF;
 IF TG_TABLE_NAME='lo3rwang_trace' THEN origin:='lo3rwang';
 ELSIF TG_TABLE_NAME='lrunes_trace' THEN origin:='lrunes';
 ELSE RAISE EXCEPTION 'Unsupported Trace source'; END IF;
 IF TG_OP='DELETE' THEN
   DELETE FROM silver.loc_trace WHERE scope_id=origin AND uid=OLD.uid;
   RETURN OLD;
 END IF;
 INSERT INTO silver.loc_trace AS target
 (scope_id,uid,trace_type,title,description,longitude,latitude,radius_m,
  anchor_uids,created_at,times,county_id,"class",class_group,
  address,floor_label,floor_level,category)
 VALUES
 (origin,NEW.uid,NEW.trace_type,NEW.title,NEW.description,NEW.longitude,
  NEW.latitude,NEW.radius_m,NEW.anchor_uids,NEW.created_at,NEW.times,
  NEW.county_id,NEW."class",NEW.class_group,NEW.address,NEW.floor_label,
  NEW.floor_level,NEW.category)
 ON CONFLICT(scope_id,uid) DO UPDATE SET
 trace_type=excluded.trace_type,title=excluded.title,
 description=excluded.description,longitude=excluded.longitude,
 latitude=excluded.latitude,radius_m=excluded.radius_m,
 anchor_uids=excluded.anchor_uids,created_at=excluded.created_at,
 times=excluded.times,county_id=excluded.county_id,
 "class"=excluded."class",class_group=excluded.class_group,
 address=excluded.address,floor_label=excluded.floor_label,
 floor_level=excluded.floor_level,category=excluded.category;
 RETURN NEW;
END
$fn$;

CREATE OR REPLACE FUNCTION silver.trace_prevent_identity_change()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'pg_catalog','silver' AS $fn$
BEGIN
 IF NEW.uid IS DISTINCT FROM OLD.uid OR NEW.trace_type IS DISTINCT FROM OLD.trace_type THEN
   RAISE EXCEPTION '痕跡 UID／類型不可修改；請另建紀錄。';
 END IF;
 IF TG_TABLE_NAME='loc_trace' AND NEW.scope_id IS DISTINCT FROM OLD.scope_id THEN
   RAISE EXCEPTION '來源 Scope 不能變更';
 END IF;
 RETURN NEW;
END
$fn$;

-- Keep the existing reviewed merge routine, changing only its 8-char validation.
DO $adapt$
DECLARE definition text;
BEGIN
 SELECT pg_get_functiondef(p.oid) INTO definition
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='silver' AND p.proname='merge_scoped_trace_anchors';
 IF definition IS NULL OR position('^[A-Za-z0-9]{8}$' in definition)=0
 THEN RAISE EXCEPTION 'Unexpected merge function; do not guess migration'; END IF;
 EXECUTE replace(definition,'^[A-Za-z0-9]{8}$','^[0-9A-F]{4}$');
END
$adapt$;

-- Rename the accidental extra identity of the alias table before rewriting its
-- corresponding RPC. This is metadata only; no articles or anchors are deleted.
ALTER TABLE silver.trace_place_alias RENAME COLUMN trace_id TO anchor_uid;

-- Rewrite the reconciler RPCs in the companion migration before dropping the
-- accidental second-ID column. The companion is intended for the same release.
ALTER TABLE silver.lo3rwang_trace ENABLE TRIGGER USER;
ALTER TABLE silver.lrunes_trace ENABLE TRIGGER USER;
ALTER TABLE silver.loc_trace ENABLE TRIGGER USER;

DO $verify$
BEGIN
 IF EXISTS (
   SELECT 1 FROM silver.lo3rwang_trace s
   LEFT JOIN silver.loc_trace l ON l.scope_id='lo3rwang' AND l.uid=s.uid
   WHERE l.uid IS NULL OR s.trace_type<>l.trace_type
 ) OR EXISTS (
   SELECT 1 FROM silver.lrunes_trace s
   LEFT JOIN silver.loc_trace l ON l.scope_id='lrunes' AND l.uid=s.uid
   WHERE l.uid IS NULL OR s.trace_type<>l.trace_type
 ) THEN RAISE EXCEPTION 'Post-cutover LOC union mismatch'; END IF;
 IF EXISTS (
  SELECT 1 FROM silver.lo3rwang_trace m CROSS JOIN LATERAL unnest(m.anchor_uids) x(uid)
  WHERE m.trace_type='map' AND NOT EXISTS (
    SELECT 1 FROM silver.lo3rwang_trace a WHERE a.uid=x.uid AND a.trace_type='anchor')
 ) THEN RAISE EXCEPTION 'Queue corrupted by migration'; END IF;
 IF EXISTS (
   SELECT 1 FROM silver.lo3rwang_trace s
   JOIN silver.trace_uid_migration_backup b
     ON b.scope_id='lo3rwang' AND s.uid=b.new_uid
   WHERE s.trace_type<>b.trace_type
      OR cardinality(s.anchor_uids)<>cardinality(b.old_anchor_uids)
 ) THEN RAISE EXCEPTION 'Type or ordered Queue cardinality changed'; END IF;
 IF EXISTS (
   SELECT 1 FROM silver.lo3rwang_trace m
   JOIN silver.trace_uid_migration_backup original
     ON original.scope_id='lo3rwang' AND original.new_uid=m.uid
   WHERE m.trace_type='map' AND m.anchor_uids IS DISTINCT FROM (
     SELECT array_agg(resolved.new_uid::text ORDER BY old.ord)
     FROM unnest(original.old_anchor_uids) WITH ORDINALITY old(uid,ord)
     JOIN silver.trace_uid_migration_backup resolved
       ON resolved.scope_id='lo3rwang' AND resolved.old_uid=old.uid
   )
 ) OR EXISTS (
   SELECT 1 FROM silver.loc_trace m
   JOIN silver.trace_uid_migration_backup original
     ON original.scope_id=m.scope_id AND original.new_uid=m.uid
   WHERE m.trace_type='map' AND m.anchor_uids IS DISTINCT FROM (
     SELECT array_agg(resolved.new_uid::text ORDER BY old.ord)
     FROM unnest(original.old_anchor_uids) WITH ORDINALITY old(uid,ord)
     JOIN silver.trace_uid_migration_backup resolved
       ON resolved.scope_id=m.scope_id AND resolved.old_uid=old.uid
   )
 ) THEN RAISE EXCEPTION 'Frame Queue order or membership changed'; END IF;
END
$verify$;

-- These still hold 582 temporary values. The live application must stop
-- using the old alias RPCs before physically removing this wrong column.
-- Final schema cleanup is a separate audited post-client release step.
COMMIT;
);
ALTER TABLE silver.lrunes_trace
 ADD CONSTRAINT lrunes_trace_uid_check CHECK(uid ~ '^[0-9A-F]{4}$');
ALTER TABLE silver.loc_trace
 ADD CONSTRAINT loc_trace_uid_check CHECK(uid ~ '^[0-9A-F]{4}$');

-- Reuse the existing Scope-local sequences, one per source, now as UID defaults.
ALTER TABLE silver.lo3rwang_trace ALTER COLUMN uid SET DEFAULT
 upper(lpad(to_hex(nextval('silver.lo3rwang_trace_short_seq'::regclass)::integer),4,'0'));
ALTER TABLE silver.lrunes_trace ALTER COLUMN uid SET DEFAULT
 upper(lpad(to_hex(nextval('silver.lrunes_trace_short_seq'::regclass)::integer),4,'0'));
ALTER TABLE silver.loc_trace ALTER COLUMN uid SET DEFAULT
 upper(lpad(to_hex(nextval('silver.loc_trace_short_seq'::regclass)::integer),4,'0'));
GRANT USAGE ON SEQUENCE silver.lo3rwang_trace_short_seq,
 silver.lrunes_trace_short_seq,silver.loc_trace_short_seq TO authenticated;

-- The LOC union retains its (scope_id,uid) primary key; no global UID.
CREATE OR REPLACE FUNCTION silver.sync_scope_trace_union()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','silver' AS $fn$
DECLARE origin text;
BEGIN
 IF TG_TABLE_SCHEMA <> 'silver' THEN RAISE EXCEPTION 'Unsupported Trace source'; END IF;
 IF TG_TABLE_NAME='lo3rwang_trace' THEN origin:='lo3rwang';
 ELSIF TG_TABLE_NAME='lrunes_trace' THEN origin:='lrunes';
 ELSE RAISE EXCEPTION 'Unsupported Trace source'; END IF;
 IF TG_OP='DELETE' THEN
   DELETE FROM silver.loc_trace WHERE scope_id=origin AND uid=OLD.uid;
   RETURN OLD;
 END IF;
 INSERT INTO silver.loc_trace AS target
 (scope_id,uid,trace_type,title,description,longitude,latitude,radius_m,
  anchor_uids,created_at,times,county_id,"class",class_group,
  address,floor_label,floor_level,category)
 VALUES
 (origin,NEW.uid,NEW.trace_type,NEW.title,NEW.description,NEW.longitude,
  NEW.latitude,NEW.radius_m,NEW.anchor_uids,NEW.created_at,NEW.times,
  NEW.county_id,NEW."class",NEW.class_group,NEW.address,NEW.floor_label,
  NEW.floor_level,NEW.category)
 ON CONFLICT(scope_id,uid) DO UPDATE SET
 trace_type=excluded.trace_type,title=excluded.title,
 description=excluded.description,longitude=excluded.longitude,
 latitude=excluded.latitude,radius_m=excluded.radius_m,
 anchor_uids=excluded.anchor_uids,created_at=excluded.created_at,
 times=excluded.times,county_id=excluded.county_id,
 "class"=excluded."class",class_group=excluded.class_group,
 address=excluded.address,floor_label=excluded.floor_label,
 floor_level=excluded.floor_level,category=excluded.category;
 RETURN NEW;
END
$fn$;

CREATE OR REPLACE FUNCTION silver.trace_prevent_identity_change()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'pg_catalog','silver' AS $fn$
BEGIN
 IF NEW.uid IS DISTINCT FROM OLD.uid OR NEW.trace_type IS DISTINCT FROM OLD.trace_type THEN
   RAISE EXCEPTION '痕跡 UID／類型不可修改；請另建紀錄。';
 END IF;
 IF TG_TABLE_NAME='loc_trace' AND NEW.scope_id IS DISTINCT FROM OLD.scope_id THEN
   RAISE EXCEPTION '來源 Scope 不能變更';
 END IF;
 RETURN NEW;
END
$fn$;

-- Keep the existing reviewed merge routine, changing only its 8-char validation.
DO $adapt$
DECLARE definition text;
BEGIN
 SELECT pg_get_functiondef(p.oid) INTO definition
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='silver' AND p.proname='merge_scoped_trace_anchors';
 IF definition IS NULL OR position('^[A-Za-z0-9]{8}$' in definition)=0
 THEN RAISE EXCEPTION 'Unexpected merge function; do not guess migration'; END IF;
 EXECUTE replace(definition,'^[A-Za-z0-9]{8}$','^[0-9A-F]{4}$');
END
$adapt$;

-- Rename the accidental extra identity of the alias table before rewriting its
-- corresponding RPC. This is metadata only; no articles or anchors are deleted.
ALTER TABLE silver.trace_place_alias RENAME COLUMN trace_id TO anchor_uid;

-- Rewrite the reconciler RPCs in the companion migration before dropping the
-- accidental second-ID column. The companion is intended for the same release.
ALTER TABLE silver.lo3rwang_trace ENABLE TRIGGER USER;
ALTER TABLE silver.lrunes_trace ENABLE TRIGGER USER;
ALTER TABLE silver.loc_trace ENABLE TRIGGER USER;

DO $verify$
BEGIN
 IF EXISTS (
   SELECT 1 FROM silver.lo3rwang_trace s
   LEFT JOIN silver.loc_trace l ON l.scope_id='lo3rwang' AND l.uid=s.uid
   WHERE l.uid IS NULL OR s.trace_type<>l.trace_type
 ) OR EXISTS (
   SELECT 1 FROM silver.lrunes_trace s
   LEFT JOIN silver.loc_trace l ON l.scope_id='lrunes' AND l.uid=s.uid
   WHERE l.uid IS NULL OR s.trace_type<>l.trace_type
 ) THEN RAISE EXCEPTION 'Post-cutover LOC union mismatch'; END IF;
 IF EXISTS (
  SELECT 1 FROM silver.lo3rwang_trace m CROSS JOIN LATERAL unnest(m.anchor_uids) x(uid)
  WHERE m.trace_type='map' AND NOT EXISTS (
    SELECT 1 FROM silver.lo3rwang_trace a WHERE a.uid=x.uid AND a.trace_type='anchor')
 ) THEN RAISE EXCEPTION 'Queue corrupted by migration'; END IF;
 IF EXISTS (
   SELECT 1 FROM silver.lo3rwang_trace s
   JOIN silver.trace_uid_migration_backup b
     ON b.scope_id='lo3rwang' AND s.uid=b.new_uid
   WHERE s.trace_type<>b.trace_type
      OR cardinality(s.anchor_uids)<>cardinality(b.old_anchor_uids)
 ) THEN RAISE EXCEPTION 'Type or ordered Queue cardinality changed'; END IF;
 IF EXISTS (
   SELECT 1 FROM silver.lo3rwang_trace m
   JOIN silver.trace_uid_migration_backup original
     ON original.scope_id='lo3rwang' AND original.new_uid=m.uid
   WHERE m.trace_type='map' AND m.anchor_uids IS DISTINCT FROM (
     SELECT array_agg(resolved.new_uid::text ORDER BY old.ord)
     FROM unnest(original.old_anchor_uids) WITH ORDINALITY old(uid,ord)
     JOIN silver.trace_uid_migration_backup resolved
       ON resolved.scope_id='lo3rwang' AND resolved.old_uid=old.uid
   )
 ) OR EXISTS (
   SELECT 1 FROM silver.loc_trace m
   JOIN silver.trace_uid_migration_backup original
     ON original.scope_id=m.scope_id AND original.new_uid=m.uid
   WHERE m.trace_type='map' AND m.anchor_uids IS DISTINCT FROM (
     SELECT array_agg(resolved.new_uid::text ORDER BY old.ord)
     FROM unnest(original.old_anchor_uids) WITH ORDINALITY old(uid,ord)
     JOIN silver.trace_uid_migration_backup resolved
       ON resolved.scope_id=m.scope_id AND resolved.old_uid=old.uid
   )
 ) THEN RAISE EXCEPTION 'Frame Queue order or membership changed'; END IF;
END
$verify$;

-- These still hold 582 temporary values. The live application must stop
-- using the old alias RPCs before physically removing this wrong column.
-- Final schema cleanup is a separate audited post-client release step.
COMMIT;
);
ALTER TABLE silver.loc_trace
 ADD CONSTRAINT loc_trace_uid_check CHECK(uid ~ '^[0-9A-F]{4}$');

-- Reuse the existing Scope-local sequences, one per source, now as UID defaults.
ALTER TABLE silver.lo3rwang_trace ALTER COLUMN uid SET DEFAULT
 upper(lpad(to_hex(nextval('silver.lo3rwang_trace_short_seq'::regclass)::integer),4,'0'));
ALTER TABLE silver.lrunes_trace ALTER COLUMN uid SET DEFAULT
 upper(lpad(to_hex(nextval('silver.lrunes_trace_short_seq'::regclass)::integer),4,'0'));
ALTER TABLE silver.loc_trace ALTER COLUMN uid SET DEFAULT
 upper(lpad(to_hex(nextval('silver.loc_trace_short_seq'::regclass)::integer),4,'0'));
GRANT USAGE ON SEQUENCE silver.lo3rwang_trace_short_seq,
 silver.lrunes_trace_short_seq,silver.loc_trace_short_seq TO authenticated;

-- The LOC union retains its (scope_id,uid) primary key; no global UID.
CREATE OR REPLACE FUNCTION silver.sync_scope_trace_union()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','silver' AS $fn$
DECLARE origin text;
BEGIN
 IF TG_TABLE_SCHEMA <> 'silver' THEN RAISE EXCEPTION 'Unsupported Trace source'; END IF;
 IF TG_TABLE_NAME='lo3rwang_trace' THEN origin:='lo3rwang';
 ELSIF TG_TABLE_NAME='lrunes_trace' THEN origin:='lrunes';
 ELSE RAISE EXCEPTION 'Unsupported Trace source'; END IF;
 IF TG_OP='DELETE' THEN
   DELETE FROM silver.loc_trace WHERE scope_id=origin AND uid=OLD.uid;
   RETURN OLD;
 END IF;
 INSERT INTO silver.loc_trace AS target
 (scope_id,uid,trace_type,title,description,longitude,latitude,radius_m,
  anchor_uids,created_at,times,county_id,"class",class_group,
  address,floor_label,floor_level,category)
 VALUES
 (origin,NEW.uid,NEW.trace_type,NEW.title,NEW.description,NEW.longitude,
  NEW.latitude,NEW.radius_m,NEW.anchor_uids,NEW.created_at,NEW.times,
  NEW.county_id,NEW."class",NEW.class_group,NEW.address,NEW.floor_label,
  NEW.floor_level,NEW.category)
 ON CONFLICT(scope_id,uid) DO UPDATE SET
 trace_type=excluded.trace_type,title=excluded.title,
 description=excluded.description,longitude=excluded.longitude,
 latitude=excluded.latitude,radius_m=excluded.radius_m,
 anchor_uids=excluded.anchor_uids,created_at=excluded.created_at,
 times=excluded.times,county_id=excluded.county_id,
 "class"=excluded."class",class_group=excluded.class_group,
 address=excluded.address,floor_label=excluded.floor_label,
 floor_level=excluded.floor_level,category=excluded.category;
 RETURN NEW;
END
$fn$;

CREATE OR REPLACE FUNCTION silver.trace_prevent_identity_change()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'pg_catalog','silver' AS $fn$
BEGIN
 IF NEW.uid IS DISTINCT FROM OLD.uid OR NEW.trace_type IS DISTINCT FROM OLD.trace_type THEN
   RAISE EXCEPTION '痕跡 UID／類型不可修改；請另建紀錄。';
 END IF;
 IF TG_TABLE_NAME='loc_trace' AND NEW.scope_id IS DISTINCT FROM OLD.scope_id THEN
   RAISE EXCEPTION '來源 Scope 不能變更';
 END IF;
 RETURN NEW;
END
$fn$;

-- Keep the existing reviewed merge routine, changing only its 8-char validation.
DO $adapt$
DECLARE definition text;
BEGIN
 SELECT pg_get_functiondef(p.oid) INTO definition
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='silver' AND p.proname='merge_scoped_trace_anchors';
 IF definition IS NULL OR position('^[A-Za-z0-9]{8}$' in definition)=0
 THEN RAISE EXCEPTION 'Unexpected merge function; do not guess migration'; END IF;
 EXECUTE replace(definition,'^[A-Za-z0-9]{8}$','^[0-9A-F]{4}$');
END
$adapt$;

-- Rename the accidental extra identity of the alias table before rewriting its
-- corresponding RPC. This is metadata only; no articles or anchors are deleted.
ALTER TABLE silver.trace_place_alias RENAME COLUMN trace_id TO anchor_uid;

-- Rewrite the reconciler RPCs in the companion migration before dropping the
-- accidental second-ID column. The companion is intended for the same release.
ALTER TABLE silver.lo3rwang_trace ENABLE TRIGGER USER;
ALTER TABLE silver.lrunes_trace ENABLE TRIGGER USER;
ALTER TABLE silver.loc_trace ENABLE TRIGGER USER;

DO $verify$
BEGIN
 IF EXISTS (
   SELECT 1 FROM silver.lo3rwang_trace s
   LEFT JOIN silver.loc_trace l ON l.scope_id='lo3rwang' AND l.uid=s.uid
   WHERE l.uid IS NULL OR s.trace_type<>l.trace_type
 ) OR EXISTS (
   SELECT 1 FROM silver.lrunes_trace s
   LEFT JOIN silver.loc_trace l ON l.scope_id='lrunes' AND l.uid=s.uid
   WHERE l.uid IS NULL OR s.trace_type<>l.trace_type
 ) THEN RAISE EXCEPTION 'Post-cutover LOC union mismatch'; END IF;
 IF EXISTS (
  SELECT 1 FROM silver.lo3rwang_trace m CROSS JOIN LATERAL unnest(m.anchor_uids) x(uid)
  WHERE m.trace_type='map' AND NOT EXISTS (
    SELECT 1 FROM silver.lo3rwang_trace a WHERE a.uid=x.uid AND a.trace_type='anchor')
 ) THEN RAISE EXCEPTION 'Queue corrupted by migration'; END IF;
 IF EXISTS (
   SELECT 1 FROM silver.lo3rwang_trace s
   JOIN silver.trace_uid_migration_backup b
     ON b.scope_id='lo3rwang' AND s.uid=b.new_uid
   WHERE s.trace_type<>b.trace_type
      OR cardinality(s.anchor_uids)<>cardinality(b.old_anchor_uids)
 ) THEN RAISE EXCEPTION 'Type or ordered Queue cardinality changed'; END IF;
 IF EXISTS (
   SELECT 1 FROM silver.lo3rwang_trace m
   JOIN silver.trace_uid_migration_backup original
     ON original.scope_id='lo3rwang' AND original.new_uid=m.uid
   WHERE m.trace_type='map' AND m.anchor_uids IS DISTINCT FROM (
     SELECT array_agg(resolved.new_uid::text ORDER BY old.ord)
     FROM unnest(original.old_anchor_uids) WITH ORDINALITY old(uid,ord)
     JOIN silver.trace_uid_migration_backup resolved
       ON resolved.scope_id='lo3rwang' AND resolved.old_uid=old.uid
   )
 ) OR EXISTS (
   SELECT 1 FROM silver.loc_trace m
   JOIN silver.trace_uid_migration_backup original
     ON original.scope_id=m.scope_id AND original.new_uid=m.uid
   WHERE m.trace_type='map' AND m.anchor_uids IS DISTINCT FROM (
     SELECT array_agg(resolved.new_uid::text ORDER BY old.ord)
     FROM unnest(original.old_anchor_uids) WITH ORDINALITY old(uid,ord)
     JOIN silver.trace_uid_migration_backup resolved
       ON resolved.scope_id=m.scope_id AND resolved.old_uid=old.uid
   )
 ) THEN RAISE EXCEPTION 'Frame Queue order or membership changed'; END IF;
END
$verify$;

-- These still hold 582 temporary values. The live application must stop
-- using the old alias RPCs before physically removing this wrong column.
-- Final schema cleanup is a separate audited post-client release step.
COMMIT;
);
ALTER TABLE silver.lrunes_trace
 ADD CONSTRAINT lrunes_trace_uid_check CHECK(uid ~ '^[0-9A-F]{4}$');
ALTER TABLE silver.loc_trace
 ADD CONSTRAINT loc_trace_uid_check CHECK(uid ~ '^[0-9A-F]{4}$');

-- Reuse the existing Scope-local sequences, one per source, now as UID defaults.
ALTER TABLE silver.lo3rwang_trace ALTER COLUMN uid SET DEFAULT
 upper(lpad(to_hex(nextval('silver.lo3rwang_trace_short_seq'::regclass)::integer),4,'0'));
ALTER TABLE silver.lrunes_trace ALTER COLUMN uid SET DEFAULT
 upper(lpad(to_hex(nextval('silver.lrunes_trace_short_seq'::regclass)::integer),4,'0'));
ALTER TABLE silver.loc_trace ALTER COLUMN uid SET DEFAULT
 upper(lpad(to_hex(nextval('silver.loc_trace_short_seq'::regclass)::integer),4,'0'));
GRANT USAGE ON SEQUENCE silver.lo3rwang_trace_short_seq,
 silver.lrunes_trace_short_seq,silver.loc_trace_short_seq TO authenticated;

-- The LOC union retains its (scope_id,uid) primary key; no global UID.
CREATE OR REPLACE FUNCTION silver.sync_scope_trace_union()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','silver' AS $fn$
DECLARE origin text;
BEGIN
 IF TG_TABLE_SCHEMA <> 'silver' THEN RAISE EXCEPTION 'Unsupported Trace source'; END IF;
 IF TG_TABLE_NAME='lo3rwang_trace' THEN origin:='lo3rwang';
 ELSIF TG_TABLE_NAME='lrunes_trace' THEN origin:='lrunes';
 ELSE RAISE EXCEPTION 'Unsupported Trace source'; END IF;
 IF TG_OP='DELETE' THEN
   DELETE FROM silver.loc_trace WHERE scope_id=origin AND uid=OLD.uid;
   RETURN OLD;
 END IF;
 INSERT INTO silver.loc_trace AS target
 (scope_id,uid,trace_type,title,description,longitude,latitude,radius_m,
  anchor_uids,created_at,times,county_id,"class",class_group,
  address,floor_label,floor_level,category)
 VALUES
 (origin,NEW.uid,NEW.trace_type,NEW.title,NEW.description,NEW.longitude,
  NEW.latitude,NEW.radius_m,NEW.anchor_uids,NEW.created_at,NEW.times,
  NEW.county_id,NEW."class",NEW.class_group,NEW.address,NEW.floor_label,
  NEW.floor_level,NEW.category)
 ON CONFLICT(scope_id,uid) DO UPDATE SET
 trace_type=excluded.trace_type,title=excluded.title,
 description=excluded.description,longitude=excluded.longitude,
 latitude=excluded.latitude,radius_m=excluded.radius_m,
 anchor_uids=excluded.anchor_uids,created_at=excluded.created_at,
 times=excluded.times,county_id=excluded.county_id,
 "class"=excluded."class",class_group=excluded.class_group,
 address=excluded.address,floor_label=excluded.floor_label,
 floor_level=excluded.floor_level,category=excluded.category;
 RETURN NEW;
END
$fn$;

CREATE OR REPLACE FUNCTION silver.trace_prevent_identity_change()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'pg_catalog','silver' AS $fn$
BEGIN
 IF NEW.uid IS DISTINCT FROM OLD.uid OR NEW.trace_type IS DISTINCT FROM OLD.trace_type THEN
   RAISE EXCEPTION '痕跡 UID／類型不可修改；請另建紀錄。';
 END IF;
 IF TG_TABLE_NAME='loc_trace' AND NEW.scope_id IS DISTINCT FROM OLD.scope_id THEN
   RAISE EXCEPTION '來源 Scope 不能變更';
 END IF;
 RETURN NEW;
END
$fn$;

-- Keep the existing reviewed merge routine, changing only its 8-char validation.
DO $adapt$
DECLARE definition text;
BEGIN
 SELECT pg_get_functiondef(p.oid) INTO definition
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='silver' AND p.proname='merge_scoped_trace_anchors';
 IF definition IS NULL OR position('^[A-Za-z0-9]{8}$' in definition)=0
 THEN RAISE EXCEPTION 'Unexpected merge function; do not guess migration'; END IF;
 EXECUTE replace(definition,'^[A-Za-z0-9]{8}$','^[0-9A-F]{4}$');
END
$adapt$;

-- Rename the accidental extra identity of the alias table before rewriting its
-- corresponding RPC. This is metadata only; no articles or anchors are deleted.
ALTER TABLE silver.trace_place_alias RENAME COLUMN trace_id TO anchor_uid;

-- Rewrite the reconciler RPCs in the companion migration before dropping the
-- accidental second-ID column. The companion is intended for the same release.
ALTER TABLE silver.lo3rwang_trace ENABLE TRIGGER USER;
ALTER TABLE silver.lrunes_trace ENABLE TRIGGER USER;
ALTER TABLE silver.loc_trace ENABLE TRIGGER USER;

DO $verify$
BEGIN
 IF EXISTS (
   SELECT 1 FROM silver.lo3rwang_trace s
   LEFT JOIN silver.loc_trace l ON l.scope_id='lo3rwang' AND l.uid=s.uid
   WHERE l.uid IS NULL OR s.trace_type<>l.trace_type
 ) OR EXISTS (
   SELECT 1 FROM silver.lrunes_trace s
   LEFT JOIN silver.loc_trace l ON l.scope_id='lrunes' AND l.uid=s.uid
   WHERE l.uid IS NULL OR s.trace_type<>l.trace_type
 ) THEN RAISE EXCEPTION 'Post-cutover LOC union mismatch'; END IF;
 IF EXISTS (
  SELECT 1 FROM silver.lo3rwang_trace m CROSS JOIN LATERAL unnest(m.anchor_uids) x(uid)
  WHERE m.trace_type='map' AND NOT EXISTS (
    SELECT 1 FROM silver.lo3rwang_trace a WHERE a.uid=x.uid AND a.trace_type='anchor')
 ) THEN RAISE EXCEPTION 'Queue corrupted by migration'; END IF;
 IF EXISTS (
   SELECT 1 FROM silver.lo3rwang_trace s
   JOIN silver.trace_uid_migration_backup b
     ON b.scope_id='lo3rwang' AND s.uid=b.new_uid
   WHERE s.trace_type<>b.trace_type
      OR cardinality(s.anchor_uids)<>cardinality(b.old_anchor_uids)
 ) THEN RAISE EXCEPTION 'Type or ordered Queue cardinality changed'; END IF;
 IF EXISTS (
   SELECT 1 FROM silver.lo3rwang_trace m
   JOIN silver.trace_uid_migration_backup original
     ON original.scope_id='lo3rwang' AND original.new_uid=m.uid
   WHERE m.trace_type='map' AND m.anchor_uids IS DISTINCT FROM (
     SELECT array_agg(resolved.new_uid::text ORDER BY old.ord)
     FROM unnest(original.old_anchor_uids) WITH ORDINALITY old(uid,ord)
     JOIN silver.trace_uid_migration_backup resolved
       ON resolved.scope_id='lo3rwang' AND resolved.old_uid=old.uid
   )
 ) OR EXISTS (
   SELECT 1 FROM silver.loc_trace m
   JOIN silver.trace_uid_migration_backup original
     ON original.scope_id=m.scope_id AND original.new_uid=m.uid
   WHERE m.trace_type='map' AND m.anchor_uids IS DISTINCT FROM (
     SELECT array_agg(resolved.new_uid::text ORDER BY old.ord)
     FROM unnest(original.old_anchor_uids) WITH ORDINALITY old(uid,ord)
     JOIN silver.trace_uid_migration_backup resolved
       ON resolved.scope_id=m.scope_id AND resolved.old_uid=old.uid
   )
 ) THEN RAISE EXCEPTION 'Frame Queue order or membership changed'; END IF;
END
$verify$;

-- These still hold 582 temporary values. The live application must stop
-- using the old alias RPCs before physically removing this wrong column.
-- Final schema cleanup is a separate audited post-client release step.
COMMIT;
