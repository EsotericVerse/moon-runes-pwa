-- Safe production expansion: canonical _time_v2 tables alongside current
-- _time legacy tables. All source data stays on original tables, including
-- old runtime's expected columns. New code resolves _time_v2.
-- The two canonical tables contain actual four-digit uid/type/address/anchor_ids.
-- No Cloudflare, Neon, ISR or legacy table changes.
BEGIN;
SET LOCAL lock_timeout='8s';
SET LOCAL statement_timeout='90s';
DO $$
BEGIN
  IF to_regclass('silver.lo3rwang_time_v2') IS NOT NULL
     OR to_regclass('silver.lrunes_time_v2') IS NOT NULL
  THEN RAISE EXCEPTION 'Time v2 already exists; do not overwrite live data'; END IF;
END $$;

CREATE TABLE silver.lo3rwang_time_v2(LIKE silver.lo3rwang_time INCLUDING DEFAULTS);
INSERT INTO silver.lo3rwang_time_v2
SELECT * FROM silver.lo3rwang_time;
ALTER TABLE silver.lo3rwang_time_v2
  ADD CONSTRAINT lo3rwang_time_v2_pkey PRIMARY KEY(record_id),
  ADD CONSTRAINT lo3rwang_time_v2_record_type_check CHECK(record_type IN ('anchor','period','event','style_comment')),
  ADD CONSTRAINT lo3rwang_time_v2_record_type_resource_id_key UNIQUE(record_type,resource_id),
  ADD CONSTRAINT lo3rwang_time_v2_style_comment_shape_check CHECK(true);

CREATE TABLE silver.lrunes_time_v2(LIKE silver.lrunes_time INCLUDING DEFAULTS);
INSERT INTO silver.lrunes_time_v2
SELECT * FROM silver.lrunes_time;
ALTER TABLE silver.lrunes_time_v2
  ADD CONSTRAINT lrunes_time_v2_pkey PRIMARY KEY(record_id),
  ADD CONSTRAINT lrunes_time_v2_record_type_check CHECK(record_type IN ('anchor','period','event','style_comment')),
  ADD CONSTRAINT lrunes_time_v2_record_type_resource_id_key UNIQUE(record_type,resource_id),
  ADD CONSTRAINT lrunes_time_v2_style_comment_shape_check CHECK(true);
-- Operates solely on the new _time_v2 copies, so the deployed
-- legacy _time readers and writers remain available during transition.
-- A real Time v2 schema is created here; no synthetic now() anchor.
CREATE TABLE IF NOT EXISTS silver.time_v2_cutover_backup (
  scope_id text NOT NULL,
  old_record_id uuid NOT NULL,
  old_resource_id text,
  new_uid varchar(4),
  original_row jsonb NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scope_id,old_record_id)
);
REVOKE ALL ON silver.time_v2_cutover_backup FROM PUBLIC,anon,authenticated;
ALTER TABLE silver.time_v2_cutover_backup ENABLE ROW LEVEL SECURITY;
INSERT INTO silver.time_v2_cutover_backup(scope_id,old_record_id,old_resource_id,original_row)
SELECT 'lo3rwang',record_id,resource_id,to_jsonb(t) FROM silver.lo3rwang_time_v2 t
UNION ALL
SELECT 'lrunes',record_id,resource_id,to_jsonb(t) FROM silver.lrunes_time_v2 t
ON CONFLICT(scope_id,old_record_id) DO NOTHING;

ALTER TABLE silver.lo3rwang_time_v2 ADD COLUMN uid varchar(4);
WITH numbered AS (
 SELECT record_id, upper(lpad(to_hex(row_number() OVER (
 ORDER BY record_type,time_date NULLS LAST,resource_id,record_id)::int),4,'0')) id
 FROM silver.lo3rwang_time_v2
)
UPDATE silver.lo3rwang_time_v2 t SET uid=n.id FROM numbered n WHERE t.record_id=n.record_id;
UPDATE silver.time_v2_cutover_backup b SET new_uid=t.uid
FROM silver.lo3rwang_time_v2 t WHERE b.scope_id='lo3rwang' AND b.old_record_id=t.record_id;
ALTER TABLE silver.lrunes_time_v2 ADD COLUMN uid varchar(4);
WITH numbered AS (
 SELECT record_id, upper(lpad(to_hex(row_number() OVER (
 ORDER BY record_type,time_date NULLS LAST,resource_id,record_id)::int),4,'0')) id
 FROM silver.lrunes_time_v2
)
UPDATE silver.lrunes_time_v2 t SET uid=n.id FROM numbered n WHERE t.record_id=n.record_id;
UPDATE silver.time_v2_cutover_backup b SET new_uid=t.uid
FROM silver.lrunes_time_v2 t WHERE b.scope_id='lrunes' AND b.old_record_id=t.record_id;

DO $$
BEGIN
  IF (SELECT count(*) FROM silver.time_v2_cutover_backup WHERE scope_id='lo3rwang')
      <> (SELECT count(*) FROM silver.lo3rwang_time_v2)
    OR EXISTS(SELECT 1 FROM silver.lo3rwang_time_v2 WHERE uid IS NULL OR length(uid)<>4) THEN
    RAISE EXCEPTION 'Unsafe Time UID mapping for lo3rwang';
  END IF;
  IF (SELECT count(*) FROM silver.time_v2_cutover_backup WHERE scope_id='lrunes')
      <> (SELECT count(*) FROM silver.lrunes_time_v2)
    OR EXISTS(SELECT 1 FROM silver.lrunes_time_v2 WHERE uid IS NULL OR length(uid)<>4) THEN
    RAISE EXCEPTION 'Unsafe Time UID mapping for lrunes';
  END IF;
END $$;
-- These tables are pg_temp only, not writable outside the current migration.
CREATE TEMP TABLE time_anchor_mapping(
  scope_id text NOT NULL,
  old_resource_id text NOT NULL,
  uid varchar(4) NOT NULL,
  PRIMARY KEY(scope_id,old_resource_id)
) ON COMMIT DROP;
INSERT INTO pg_temp.time_anchor_mapping(scope_id,old_resource_id,uid)
SELECT 'lo3rwang',resource_id,uid FROM silver.lo3rwang_time_v2 WHERE record_type='anchor';
INSERT INTO pg_temp.time_anchor_mapping(scope_id,old_resource_id,uid)
SELECT 'lrunes',resource_id,uid FROM silver.lrunes_time_v2 WHERE record_type='anchor';

-- Convert an old ordered anchor list to typed time_period reference tokens.
-- Do NOT infer dates or rejoin broken edges; every target must be present.
CREATE FUNCTION silver._cutover_time_segments(p_scope text,p_refs text[],p_old_type text)
RETURNS text[] LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  ids text[]:=ARRAY[]::text[];
  item text; mapped text; i integer;
BEGIN
  IF coalesce(cardinality(p_refs),0)=0 THEN
    RAISE EXCEPTION 'Old Time % record missing anchor references',p_old_type;
  END IF;
  FOR i IN 1..cardinality(p_refs) LOOP
    item:=p_refs[i];
    -- A historical '0' is NOT a date. Drop the virtual-now reference.
    IF item='0' THEN CONTINUE; END IF;
    mapped:=NULL;
    SELECT uid INTO mapped FROM pg_temp.time_anchor_mapping
      WHERE scope_id=p_scope AND old_resource_id=item;
    IF mapped IS NULL THEN RAISE EXCEPTION 'Missing Time anchor % in %',item,p_scope; END IF;
    ids:=array_append(ids,mapped);
  END LOOP;
  IF cardinality(ids)<1 THEN RAISE EXCEPTION 'Time event with no real anchor'; END IF;
  IF p_old_type='period' AND cardinality(ids)>2 THEN
    RAISE EXCEPTION 'Old Time trace has over two boundary anchors';
  END IF;
  IF p_old_type NOT IN ('period','event') THEN
    RAISE EXCEPTION 'Unsupported Time kind %',p_old_type;
  END IF;
  -- Event triples are split into actual two-anchor event rows separately.
  RETURN ids[1:LEAST(cardinality(ids),2)];
END $$;
-- Save a separate, actual time_period UID for each historical time_trace
-- boundary. These refer to genuine anchor UIDs and never manufacture dates.
CREATE TEMP TABLE time_legacy_baselines(
  scope_id text NOT NULL,
  old_record_id uuid NOT NULL,
  uid varchar(4) NOT NULL,
  anchor_ids text[] NOT NULL,
  PRIMARY KEY(scope_id,old_record_id)
) ON COMMIT DROP;

INSERT INTO pg_temp.time_legacy_baselines(scope_id,old_record_id,uid,anchor_ids)
WITH original_count AS (SELECT count(*) AS n FROM silver.lo3rwang_time_v2),
numbered AS (
 SELECT record_id,anchor_ids,
        row_number() OVER (ORDER BY display_order NULLS LAST,resource_id,record_id) AS ord
 FROM silver.lo3rwang_time_v2 WHERE record_type='period'
)
SELECT 'lo3rwang',n.record_id,
  upper(lpad(to_hex((c.n+n.ord)::integer),4,'0')),
  silver._cutover_time_segments('lo3rwang',n.anchor_ids,'period')
FROM numbered n CROSS JOIN original_count c;

-- Preserve every edge of exceptional 3+ anchor legacy events by
-- creating additional real time_period rows for successive endpoint pairs.
-- Each generated event has no independent DATE value.
WITH original_count AS (SELECT count(*) AS n FROM silver.lo3rwang_time_v2),
     baseline_count AS (SELECT count(*) AS n FROM pg_temp.time_legacy_baselines WHERE scope_id='lo3rwang'),
     extra_events AS (
       SELECT t.record_id,t.label,t.note,t.anchor_ids,g.pos,
         row_number() OVER (ORDER BY t.record_id,g.pos) AS seq
       FROM silver.lo3rwang_time_v2 t
       CROSS JOIN LATERAL generate_series(2,cardinality(t.anchor_ids)-1) AS g(pos)
       WHERE t.record_type='event'
     )
INSERT INTO silver.lo3rwang_time_v2(record_type,resource_id,label,note,status,time_date,anchor_ids,uid)
SELECT 'event','__legacy_event_segment__:'||e.record_id::text||':'||e.pos,
       coalesce(e.label,'')||'｜分段 '||e.pos,e.note,
       'legacy_split',NULL,
       silver._cutover_time_segments('lo3rwang',
         ARRAY[e.anchor_ids[e.pos],e.anchor_ids[e.pos+1]],'event'),
       upper(lpad(to_hex((oc.n+bc.n+e.seq)::integer),4,'0'))
FROM extra_events e CROSS JOIN original_count oc CROSS JOIN baseline_count bc;

UPDATE silver.lo3rwang_time_v2 t
SET anchor_ids=silver._cutover_time_segments('lo3rwang',t.anchor_ids,'event')
WHERE record_type='event' AND status IS DISTINCT FROM 'legacy_split';

UPDATE silver.lo3rwang_time_v2 t SET anchor_ids=ARRAY[b.uid::text]
FROM pg_temp.time_legacy_baselines b
WHERE b.scope_id='lo3rwang' AND b.old_record_id=t.record_id AND t.record_type='period';

INSERT INTO silver.lo3rwang_time_v2(record_type,resource_id,label,note,status,time_date,anchor_ids,uid)
SELECT 'event','__legacy_time_boundary__:'||b.old_record_id::text,
       coalesce(t.label,'')||'｜原時期定錨範圍',
       '保留既有時期定錨點範圍', 'legacy_boundary',
       NULL,b.anchor_ids,b.uid
FROM pg_temp.time_legacy_baselines b
JOIN silver.lo3rwang_time_v2 t ON t.record_id=b.old_record_id
WHERE b.scope_id='lo3rwang';

-- Archive style_comment rows before removing them from the active model.
DELETE FROM silver.lo3rwang_time_v2 WHERE record_type='style_comment';

UPDATE silver.lo3rwang_time_v2 SET note=CASE
  WHEN nullif(btrim(note),'') IS NULL THEN nullif(style_description,'')
  WHEN nullif(btrim(style_description),'') IS NULL THEN note
  ELSE note||E'\\n'||style_description END;

ALTER TABLE silver.lo3rwang_time_v2
 DROP CONSTRAINT lo3rwang_time_v2_style_comment_shape_check,
 DROP CONSTRAINT lo3rwang_time_v2_record_type_check,
 DROP CONSTRAINT lo3rwang_time_v2_record_type_resource_id_key,
 DROP CONSTRAINT lo3rwang_time_v2_pkey;
DROP INDEX IF EXISTS silver.lo3rwang_time_v2_order_idx;
DROP INDEX IF EXISTS silver.lo3rwang_time_v2_style_comment_lookup_idx;

ALTER TABLE silver.lo3rwang_time_v2 RENAME COLUMN record_type TO type;
ALTER TABLE silver.lo3rwang_time_v2 RENAME COLUMN label TO title;
ALTER TABLE silver.lo3rwang_time_v2 RENAME COLUMN note TO description;
-- DATE -> DATE; rename only: no second date value, no timezone conversion.
ALTER TABLE silver.lo3rwang_time_v2 RENAME COLUMN time_date TO address;
UPDATE silver.lo3rwang_time_v2 SET type=CASE type
  WHEN 'event' THEN 'time_period'
  WHEN 'period' THEN 'time_trace'
  ELSE type END;

ALTER TABLE silver.lo3rwang_time_v2
 DROP COLUMN record_id,
 DROP COLUMN resource_id,
 DROP COLUMN display_order,
 DROP COLUMN date_status,
 DROP COLUMN year_value,
 DROP COLUMN visibility,
 DROP COLUMN created_at,
 DROP COLUMN updated_at,
 DROP COLUMN style_description,
 ALTER COLUMN uid SET NOT NULL,
 ADD CONSTRAINT lo3rwang_time_v2_pkey PRIMARY KEY(uid),
 ADD CONSTRAINT lo3rwang_time_v2_type_check CHECK (type IN ('anchor','time_period','time_trace')),
 ADD CONSTRAINT lo3rwang_time_v2_address_check CHECK (
   (type='anchor' AND address IS NOT NULL) OR
   (type<>'anchor' AND address IS NULL)),
 ADD CONSTRAINT lo3rwang_time_v2_reference_shape_check CHECK (
   type='anchor' OR
   (type='time_period' AND anchor_ids IS NOT NULL
     AND cardinality(anchor_ids) BETWEEN 1 AND 2) OR
   (type='time_trace' AND anchor_ids IS NOT NULL
     AND cardinality(anchor_ids)>0)
 );

-- Every trace only lists existing time_period UIDs; each event's tokens
-- resolve to existing anchor UIDs. The reader tolerates future deleted links.
DO $$
BEGIN
  IF EXISTS(
    SELECT 1 FROM silver.lo3rwang_time_v2 t CROSS JOIN LATERAL unnest(t.anchor_ids) x(uid)
    WHERE t.type='time_trace' AND NOT EXISTS(
      SELECT 1 FROM silver.lo3rwang_time_v2 e WHERE e.uid=x.uid AND e.type='time_period')
  ) THEN RAISE EXCEPTION 'Invalid migrated time_trace links for lo3rwang'; END IF;
  IF EXISTS(
    SELECT 1 FROM silver.lo3rwang_time_v2 t CROSS JOIN LATERAL unnest(t.anchor_ids) x(uid)
    WHERE t.type='time_period' AND NOT EXISTS(
      SELECT 1 FROM silver.lo3rwang_time_v2 a WHERE a.uid=x.uid AND a.type='anchor')
  ) THEN RAISE EXCEPTION 'Broken migrated time_period anchor UID for lo3rwang'; END IF;
END $$;

INSERT INTO pg_temp.time_legacy_baselines(scope_id,old_record_id,uid,anchor_ids)
WITH original_count AS (SELECT count(*) AS n FROM silver.lrunes_time_v2),
numbered AS (
 SELECT record_id,anchor_ids,
        row_number() OVER (ORDER BY display_order NULLS LAST,resource_id,record_id) AS ord
 FROM silver.lrunes_time_v2 WHERE record_type='period'
)
SELECT 'lrunes',n.record_id,
  upper(lpad(to_hex((c.n+n.ord)::integer),4,'0')),
  silver._cutover_time_segments('lrunes',n.anchor_ids,'period')
FROM numbered n CROSS JOIN original_count c;

-- Preserve every edge of exceptional 3+ anchor legacy events by
-- creating additional real time_period rows for successive endpoint pairs.
-- Each generated event has no independent DATE value.
WITH original_count AS (SELECT count(*) AS n FROM silver.lrunes_time_v2),
     baseline_count AS (SELECT count(*) AS n FROM pg_temp.time_legacy_baselines WHERE scope_id='lrunes'),
     extra_events AS (
       SELECT t.record_id,t.label,t.note,t.anchor_ids,g.pos,
         row_number() OVER (ORDER BY t.record_id,g.pos) AS seq
       FROM silver.lrunes_time_v2 t
       CROSS JOIN LATERAL generate_series(2,cardinality(t.anchor_ids)-1) AS g(pos)
       WHERE t.record_type='event'
     )
INSERT INTO silver.lrunes_time_v2(record_type,resource_id,label,note,status,time_date,anchor_ids,uid)
SELECT 'event','__legacy_event_segment__:'||e.record_id::text||':'||e.pos,
       coalesce(e.label,'')||'｜分段 '||e.pos,e.note,
       'legacy_split',NULL,
       silver._cutover_time_segments('lrunes',
         ARRAY[e.anchor_ids[e.pos],e.anchor_ids[e.pos+1]],'event'),
       upper(lpad(to_hex((oc.n+bc.n+e.seq)::integer),4,'0'))
FROM extra_events e CROSS JOIN original_count oc CROSS JOIN baseline_count bc;

UPDATE silver.lrunes_time_v2 t
SET anchor_ids=silver._cutover_time_segments('lrunes',t.anchor_ids,'event')
WHERE record_type='event' AND status IS DISTINCT FROM 'legacy_split';

UPDATE silver.lrunes_time_v2 t SET anchor_ids=ARRAY[b.uid::text]
FROM pg_temp.time_legacy_baselines b
WHERE b.scope_id='lrunes' AND b.old_record_id=t.record_id AND t.record_type='period';

INSERT INTO silver.lrunes_time_v2(record_type,resource_id,label,note,status,time_date,anchor_ids,uid)
SELECT 'event','__legacy_time_boundary__:'||b.old_record_id::text,
       coalesce(t.label,'')||'｜原時期定錨範圍',
       '保留既有時期定錨點範圍', 'legacy_boundary',
       NULL,b.anchor_ids,b.uid
FROM pg_temp.time_legacy_baselines b
JOIN silver.lrunes_time_v2 t ON t.record_id=b.old_record_id
WHERE b.scope_id='lrunes';

-- Archive style_comment rows before removing them from the active model.
DELETE FROM silver.lrunes_time_v2 WHERE record_type='style_comment';

UPDATE silver.lrunes_time_v2 SET note=CASE
  WHEN nullif(btrim(note),'') IS NULL THEN nullif(style_description,'')
  WHEN nullif(btrim(style_description),'') IS NULL THEN note
  ELSE note||E'\\n'||style_description END;

ALTER TABLE silver.lrunes_time_v2
 DROP CONSTRAINT lrunes_time_v2_style_comment_shape_check,
 DROP CONSTRAINT lrunes_time_v2_record_type_check,
 DROP CONSTRAINT lrunes_time_v2_record_type_resource_id_key,
 DROP CONSTRAINT lrunes_time_v2_pkey;
DROP INDEX IF EXISTS silver.lrunes_time_v2_order_idx;
DROP INDEX IF EXISTS silver.lrunes_time_v2_style_comment_lookup_idx;

ALTER TABLE silver.lrunes_time_v2 RENAME COLUMN record_type TO type;
ALTER TABLE silver.lrunes_time_v2 RENAME COLUMN label TO title;
ALTER TABLE silver.lrunes_time_v2 RENAME COLUMN note TO description;
-- DATE -> DATE; rename only: no second date value, no timezone conversion.
ALTER TABLE silver.lrunes_time_v2 RENAME COLUMN time_date TO address;
UPDATE silver.lrunes_time_v2 SET type=CASE type
  WHEN 'event' THEN 'time_period'
  WHEN 'period' THEN 'time_trace'
  ELSE type END;

ALTER TABLE silver.lrunes_time_v2
 DROP COLUMN record_id,
 DROP COLUMN resource_id,
 DROP COLUMN display_order,
 DROP COLUMN date_status,
 DROP COLUMN year_value,
 DROP COLUMN visibility,
 DROP COLUMN created_at,
 DROP COLUMN updated_at,
 DROP COLUMN style_description,
 ALTER COLUMN uid SET NOT NULL,
 ADD CONSTRAINT lrunes_time_v2_pkey PRIMARY KEY(uid),
 ADD CONSTRAINT lrunes_time_v2_type_check CHECK (type IN ('anchor','time_period','time_trace')),
 ADD CONSTRAINT lrunes_time_v2_address_check CHECK (
   (type='anchor' AND address IS NOT NULL) OR
   (type<>'anchor' AND address IS NULL)),
 ADD CONSTRAINT lrunes_time_v2_reference_shape_check CHECK (
   type='anchor' OR
   (type='time_period' AND anchor_ids IS NOT NULL
     AND cardinality(anchor_ids) BETWEEN 1 AND 2) OR
   (type='time_trace' AND anchor_ids IS NOT NULL
     AND cardinality(anchor_ids)>0)
 );

-- Every trace only lists existing time_period UIDs; each event's tokens
-- resolve to existing anchor UIDs. The reader tolerates future deleted links.
DO $$
BEGIN
  IF EXISTS(
    SELECT 1 FROM silver.lrunes_time_v2 t CROSS JOIN LATERAL unnest(t.anchor_ids) x(uid)
    WHERE t.type='time_trace' AND NOT EXISTS(
      SELECT 1 FROM silver.lrunes_time_v2 e WHERE e.uid=x.uid AND e.type='time_period')
  ) THEN RAISE EXCEPTION 'Invalid migrated time_trace links for lrunes'; END IF;
  IF EXISTS(
    SELECT 1 FROM silver.lrunes_time_v2 t CROSS JOIN LATERAL unnest(t.anchor_ids) x(uid)
    WHERE t.type='time_period' AND NOT EXISTS(
      SELECT 1 FROM silver.lrunes_time_v2 a WHERE a.uid=x.uid AND a.type='anchor')
  ) THEN RAISE EXCEPTION 'Broken migrated time_period anchor UID for lrunes'; END IF;
END $$;

DROP FUNCTION silver._cutover_time_segments(text,text[],text);
-- Original Time rows plus old-name -> new-UID audit remain in the private,
-- explicitly revoked backup table. No Cloudflare/Vercel/Neon operations.

-- Preserve original Time data and all old-client read/write paths. New-client
-- writes target _time_v2 exclusively. Before coordinating release, confirm
-- no new legacy edits occurred since this snapshot; only then retire _time.

ALTER TABLE silver.lo3rwang_time_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY lo3rwang_time_v2_public_read ON silver.lo3rwang_time_v2
  FOR SELECT TO PUBLIC USING (true);
CREATE POLICY lo3rwang_time_v2_scope_insert ON silver.lo3rwang_time_v2
  FOR INSERT TO authenticated WITH CHECK (silver.can_manage_scope('lo3rwang'));
CREATE POLICY lo3rwang_time_v2_scope_update ON silver.lo3rwang_time_v2
  FOR UPDATE TO authenticated USING (silver.can_manage_scope('lo3rwang'))
  WITH CHECK (silver.can_manage_scope('lo3rwang'));
CREATE POLICY lo3rwang_time_v2_scope_delete ON silver.lo3rwang_time_v2
  FOR DELETE TO authenticated USING (silver.can_manage_scope('lo3rwang'));
REVOKE ALL ON silver.lo3rwang_time_v2 FROM PUBLIC;
GRANT SELECT,INSERT,UPDATE,DELETE ON silver.lo3rwang_time_v2 TO authenticated;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
   EXECUTE 'GRANT SELECT ON silver.lo3rwang_time_v2 TO anon';
 END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anonymous') THEN
   EXECUTE 'GRANT SELECT ON silver.lo3rwang_time_v2 TO anonymous';
 END IF;
END $$;
CREATE INDEX lo3rwang_time_v2_anchor_address_idx ON silver.lo3rwang_time_v2(address)
  WHERE type='anchor';
CREATE INDEX lo3rwang_time_v2_type_idx ON silver.lo3rwang_time_v2(type);
DO $$
DECLARE original_count integer;
        backup_count integer;
        new_anchors integer;
        old_anchors integer;
BEGIN
 SELECT count(*) INTO original_count FROM silver.lo3rwang_time;
 SELECT count(*) INTO backup_count FROM silver.time_v2_cutover_backup WHERE scope_id='lo3rwang';
 SELECT count(*) INTO new_anchors FROM silver.lo3rwang_time_v2 WHERE type='anchor';
 SELECT count(*) INTO old_anchors FROM silver.lo3rwang_time WHERE record_type='anchor';
 IF original_count<>backup_count OR new_anchors<>old_anchors THEN
   RAISE EXCEPTION 'Time conversion reconciliation failed for lo3rwang original %, backup %, anchors %, old %',
    original_count,backup_count,new_anchors,old_anchors;
 END IF;
END $$;

ALTER TABLE silver.lrunes_time_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY lrunes_time_v2_public_read ON silver.lrunes_time_v2
  FOR SELECT TO PUBLIC USING (true);
CREATE POLICY lrunes_time_v2_scope_insert ON silver.lrunes_time_v2
  FOR INSERT TO authenticated WITH CHECK (silver.can_manage_scope('lrunes'));
CREATE POLICY lrunes_time_v2_scope_update ON silver.lrunes_time_v2
  FOR UPDATE TO authenticated USING (silver.can_manage_scope('lrunes'))
  WITH CHECK (silver.can_manage_scope('lrunes'));
CREATE POLICY lrunes_time_v2_scope_delete ON silver.lrunes_time_v2
  FOR DELETE TO authenticated USING (silver.can_manage_scope('lrunes'));
REVOKE ALL ON silver.lrunes_time_v2 FROM PUBLIC;
GRANT SELECT,INSERT,UPDATE,DELETE ON silver.lrunes_time_v2 TO authenticated;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
   EXECUTE 'GRANT SELECT ON silver.lrunes_time_v2 TO anon';
 END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anonymous') THEN
   EXECUTE 'GRANT SELECT ON silver.lrunes_time_v2 TO anonymous';
 END IF;
END $$;
CREATE INDEX lrunes_time_v2_anchor_address_idx ON silver.lrunes_time_v2(address)
  WHERE type='anchor';
CREATE INDEX lrunes_time_v2_type_idx ON silver.lrunes_time_v2(type);
DO $$
DECLARE original_count integer;
        backup_count integer;
        new_anchors integer;
        old_anchors integer;
BEGIN
 SELECT count(*) INTO original_count FROM silver.lrunes_time;
 SELECT count(*) INTO backup_count FROM silver.time_v2_cutover_backup WHERE scope_id='lrunes';
 SELECT count(*) INTO new_anchors FROM silver.lrunes_time_v2 WHERE type='anchor';
 SELECT count(*) INTO old_anchors FROM silver.lrunes_time WHERE record_type='anchor';
 IF original_count<>backup_count OR new_anchors<>old_anchors THEN
   RAISE EXCEPTION 'Time conversion reconciliation failed for lrunes original %, backup %, anchors %, old %',
    original_count,backup_count,new_anchors,old_anchors;
 END IF;
END $$;

COMMIT;
