-- Atomic, manual-only Time schema cutover. DO NOT apply until the new
-- Culture client is ready to publish; current deployed code reads old fields.
-- Names: time.uid (4 chars), time.address (DATE), anchor -> time_period
-- (old event) -> time_trace (old period). No trace/time date duplication.
BEGIN;
CREATE TABLE IF NOT EXISTS silver.time_uid_cutover_backup (
  scope_id text NOT NULL,
  old_record_id uuid NOT NULL,
  old_resource_id text,
  new_uid varchar(4),
  original_row jsonb NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scope_id,old_record_id)
);
REVOKE ALL ON silver.time_uid_cutover_backup FROM PUBLIC,anon,authenticated;
INSERT INTO silver.time_uid_cutover_backup(scope_id,old_record_id,old_resource_id,original_row)
SELECT 'lo3rwang',record_id,resource_id,to_jsonb(t) FROM silver.lo3rwang_time t
UNION ALL
SELECT 'lrunes',record_id,resource_id,to_jsonb(t) FROM silver.lrunes_time t
ON CONFLICT(scope_id,old_record_id) DO NOTHING;

ALTER TABLE silver.lo3rwang_time ADD COLUMN uid varchar(4);
WITH numbered AS (
 SELECT record_id, upper(lpad(to_hex(row_number() OVER (
 ORDER BY record_type,time_date NULLS LAST,resource_id,record_id)::int),4,'0')) id
 FROM silver.lo3rwang_time
)
UPDATE silver.lo3rwang_time t SET uid=n.id FROM numbered n WHERE t.record_id=n.record_id;
UPDATE silver.time_uid_cutover_backup b SET new_uid=t.uid
FROM silver.lo3rwang_time t WHERE b.scope_id='lo3rwang' AND b.old_record_id=t.record_id;
ALTER TABLE silver.lrunes_time ADD COLUMN uid varchar(4);
WITH numbered AS (
 SELECT record_id, upper(lpad(to_hex(row_number() OVER (
 ORDER BY record_type,time_date NULLS LAST,resource_id,record_id)::int),4,'0')) id
 FROM silver.lrunes_time
)
UPDATE silver.lrunes_time t SET uid=n.id FROM numbered n WHERE t.record_id=n.record_id;
UPDATE silver.time_uid_cutover_backup b SET new_uid=t.uid
FROM silver.lrunes_time t WHERE b.scope_id='lrunes' AND b.old_record_id=t.record_id;

DO $$
BEGIN
  IF (SELECT count(*) FROM silver.time_uid_cutover_backup WHERE scope_id='lo3rwang')
      <> (SELECT count(*) FROM silver.lo3rwang_time)
    OR EXISTS(SELECT 1 FROM silver.lo3rwang_time WHERE uid IS NULL OR length(uid)<>4) THEN
    RAISE EXCEPTION 'Unsafe Time UID mapping for lo3rwang';
  END IF;
  IF (SELECT count(*) FROM silver.time_uid_cutover_backup WHERE scope_id='lrunes')
      <> (SELECT count(*) FROM silver.lrunes_time)
    OR EXISTS(SELECT 1 FROM silver.lrunes_time WHERE uid IS NULL OR length(uid)<>4) THEN
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
SELECT 'lo3rwang',resource_id,uid FROM silver.lo3rwang_time WHERE record_type='anchor';
INSERT INTO pg_temp.time_anchor_mapping(scope_id,old_resource_id,uid)
SELECT 'lrunes',resource_id,uid FROM silver.lrunes_time WHERE record_type='anchor';

-- Convert an old ordered anchor list to typed time_period reference tokens.
-- Do NOT infer dates or rejoin broken edges; every target must be present.
CREATE FUNCTION silver._cutover_time_segments(p_scope text,p_refs text[],p_old_type text)
RETURNS text[] LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE n integer:=coalesce(cardinality(p_refs),0);
  ids text[]:=ARRAY[]::text[]; edges text[]:=ARRAY[]::text[];
  item text; mapped text; i integer;
BEGIN
  IF n=0 THEN RETURN ARRAY[]::text[]; END IF;
  FOR i IN 1..n LOOP
    item:=p_refs[i];
    IF item='0' THEN mapped:='0';
    ELSE
      SELECT uid INTO mapped FROM pg_temp.time_anchor_mapping
        WHERE scope_id=p_scope AND old_resource_id=item;
      IF mapped IS NULL THEN RAISE EXCEPTION 'Missing old anchor % in %',item,p_scope; END IF;
    END IF;
    ids:=array_append(ids,mapped);
  END LOOP;
  IF p_old_type='period' THEN
    IF n>2 OR ids[1]='0' THEN
      RAISE EXCEPTION 'Old period has invalid anchor endpoints for %',p_scope;
    END IF;
    RETURN CASE WHEN n=1 THEN ARRAY[ids[1]] ELSE ARRAY[ids[1]||'-'||ids[2]] END;
  END IF;
  IF p_old_type='event' THEN
    IF array_position(ids,'0') IS NOT NULL THEN
      RAISE EXCEPTION 'Unexpected open endpoint in historical event %',p_scope;
    END IF;
    IF n=1 THEN RETURN ARRAY[ids[1]]; END IF;
    FOR i IN 2..n LOOP
      edges:=array_append(edges,ids[i-1]||'-'||ids[i]);
    END LOOP;
    RETURN edges;
  END IF;
  RAISE EXCEPTION 'Unsupported legacy Time type %',p_old_type;
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
WITH original_count AS (SELECT count(*) AS n FROM silver.lo3rwang_time),
numbered AS (
 SELECT record_id,anchor_ids,
        row_number() OVER (ORDER BY display_order NULLS LAST,resource_id,record_id) AS ord
 FROM silver.lo3rwang_time WHERE record_type='period'
)
SELECT 'lo3rwang',n.record_id,
  upper(lpad(to_hex((c.n+n.ord)::integer),4,'0')),
  silver._cutover_time_segments('lo3rwang',n.anchor_ids,'period')
FROM numbered n CROSS JOIN original_count c;

UPDATE silver.lo3rwang_time t
SET anchor_ids=silver._cutover_time_segments('lo3rwang',t.anchor_ids,'event')
WHERE record_type='event';

UPDATE silver.lo3rwang_time t SET anchor_ids=ARRAY[b.uid::text]
FROM pg_temp.time_legacy_baselines b
WHERE b.scope_id='lo3rwang' AND b.old_record_id=t.record_id AND t.record_type='period';

INSERT INTO silver.lo3rwang_time(record_type,resource_id,label,note,status,time_date,anchor_ids,uid)
SELECT 'event','__legacy_time_boundary__:'||b.old_record_id::text,
       coalesce(t.label,'')||'｜原時期定錨範圍',
       '保留既有時期定錨點範圍', 'legacy_boundary',
       NULL,b.anchor_ids,b.uid
FROM pg_temp.time_legacy_baselines b
JOIN silver.lo3rwang_time t ON t.record_id=b.old_record_id
WHERE b.scope_id='lo3rwang';

-- Archive style_comment rows before removing them from the active model.
DELETE FROM silver.lo3rwang_time WHERE record_type='style_comment';

UPDATE silver.lo3rwang_time SET note=CASE
  WHEN nullif(btrim(note),'') IS NULL THEN nullif(style_description,'')
  WHEN nullif(btrim(style_description),'') IS NULL THEN note
  ELSE note||E'\\n'||style_description END;

ALTER TABLE silver.lo3rwang_time
 DROP CONSTRAINT lo3rwang_time_style_comment_shape_check,
 DROP CONSTRAINT lo3rwang_time_record_type_check,
 DROP CONSTRAINT lo3rwang_time_record_type_resource_id_key,
 DROP CONSTRAINT lo3rwang_time_pkey;
DROP INDEX IF EXISTS silver.lo3rwang_time_order_idx;
DROP INDEX IF EXISTS silver.lo3rwang_time_style_comment_lookup_idx;

ALTER TABLE silver.lo3rwang_time RENAME COLUMN record_type TO type;
ALTER TABLE silver.lo3rwang_time RENAME COLUMN label TO title;
ALTER TABLE silver.lo3rwang_time RENAME COLUMN note TO description;
-- DATE -> DATE; rename only: no second date value, no timezone conversion.
ALTER TABLE silver.lo3rwang_time RENAME COLUMN time_date TO address;
UPDATE silver.lo3rwang_time SET type=CASE type
  WHEN 'event' THEN 'time_period'
  WHEN 'period' THEN 'time_trace'
  ELSE type END;

ALTER TABLE silver.lo3rwang_time
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
 ADD CONSTRAINT lo3rwang_time_pkey PRIMARY KEY(uid),
 ADD CONSTRAINT lo3rwang_time_type_check CHECK (type IN ('anchor','time_period','time_trace')),
 ADD CONSTRAINT lo3rwang_time_address_check CHECK (
   (type='anchor' AND address IS NOT NULL) OR
   (type<>'anchor' AND address IS NULL)),
 ADD CONSTRAINT lo3rwang_time_reference_shape_check CHECK (
   type='anchor' OR
   (anchor_ids IS NOT NULL AND cardinality(anchor_ids)>0)
 );

-- Every trace only lists existing time_period UIDs; each event's tokens
-- resolve to existing anchor UIDs. The reader tolerates future deleted links.
DO $$
BEGIN
  IF EXISTS(
    SELECT 1 FROM silver.lo3rwang_time t CROSS JOIN LATERAL unnest(t.anchor_ids) x(uid)
    WHERE t.type='time_trace' AND NOT EXISTS(
      SELECT 1 FROM silver.lo3rwang_time e WHERE e.uid=x.uid AND e.type='time_period')
  ) THEN RAISE EXCEPTION 'Invalid migrated time_trace links for lo3rwang'; END IF;
  IF EXISTS(
    SELECT 1 FROM silver.lo3rwang_time t CROSS JOIN LATERAL unnest(t.anchor_ids) x(token)
    WHERE t.type='time_period' AND x.token !~ '^[0-9A-F]{4}(-([0-9A-F]{4}|0))?$'
  ) THEN RAISE EXCEPTION 'Malformed time_period anchor reference for lo3rwang'; END IF;
END $$;

INSERT INTO pg_temp.time_legacy_baselines(scope_id,old_record_id,uid,anchor_ids)
WITH original_count AS (SELECT count(*) AS n FROM silver.lrunes_time),
numbered AS (
 SELECT record_id,anchor_ids,
        row_number() OVER (ORDER BY display_order NULLS LAST,resource_id,record_id) AS ord
 FROM silver.lrunes_time WHERE record_type='period'
)
SELECT 'lrunes',n.record_id,
  upper(lpad(to_hex((c.n+n.ord)::integer),4,'0')),
  silver._cutover_time_segments('lrunes',n.anchor_ids,'period')
FROM numbered n CROSS JOIN original_count c;

UPDATE silver.lrunes_time t
SET anchor_ids=silver._cutover_time_segments('lrunes',t.anchor_ids,'event')
WHERE record_type='event';

UPDATE silver.lrunes_time t SET anchor_ids=ARRAY[b.uid::text]
FROM pg_temp.time_legacy_baselines b
WHERE b.scope_id='lrunes' AND b.old_record_id=t.record_id AND t.record_type='period';

INSERT INTO silver.lrunes_time(record_type,resource_id,label,note,status,time_date,anchor_ids,uid)
SELECT 'event','__legacy_time_boundary__:'||b.old_record_id::text,
       coalesce(t.label,'')||'｜原時期定錨範圍',
       '保留既有時期定錨點範圍', 'legacy_boundary',
       NULL,b.anchor_ids,b.uid
FROM pg_temp.time_legacy_baselines b
JOIN silver.lrunes_time t ON t.record_id=b.old_record_id
WHERE b.scope_id='lrunes';

-- Archive style_comment rows before removing them from the active model.
DELETE FROM silver.lrunes_time WHERE record_type='style_comment';

UPDATE silver.lrunes_time SET note=CASE
  WHEN nullif(btrim(note),'') IS NULL THEN nullif(style_description,'')
  WHEN nullif(btrim(style_description),'') IS NULL THEN note
  ELSE note||E'\\n'||style_description END;

ALTER TABLE silver.lrunes_time
 DROP CONSTRAINT lrunes_time_style_comment_shape_check,
 DROP CONSTRAINT lrunes_time_record_type_check,
 DROP CONSTRAINT lrunes_time_record_type_resource_id_key,
 DROP CONSTRAINT lrunes_time_pkey;
DROP INDEX IF EXISTS silver.lrunes_time_order_idx;
DROP INDEX IF EXISTS silver.lrunes_time_style_comment_lookup_idx;

ALTER TABLE silver.lrunes_time RENAME COLUMN record_type TO type;
ALTER TABLE silver.lrunes_time RENAME COLUMN label TO title;
ALTER TABLE silver.lrunes_time RENAME COLUMN note TO description;
-- DATE -> DATE; rename only: no second date value, no timezone conversion.
ALTER TABLE silver.lrunes_time RENAME COLUMN time_date TO address;
UPDATE silver.lrunes_time SET type=CASE type
  WHEN 'event' THEN 'time_period'
  WHEN 'period' THEN 'time_trace'
  ELSE type END;

ALTER TABLE silver.lrunes_time
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
 ADD CONSTRAINT lrunes_time_pkey PRIMARY KEY(uid),
 ADD CONSTRAINT lrunes_time_type_check CHECK (type IN ('anchor','time_period','time_trace')),
 ADD CONSTRAINT lrunes_time_address_check CHECK (
   (type='anchor' AND address IS NOT NULL) OR
   (type<>'anchor' AND address IS NULL)),
 ADD CONSTRAINT lrunes_time_reference_shape_check CHECK (
   type='anchor' OR
   (anchor_ids IS NOT NULL AND cardinality(anchor_ids)>0)
 );

-- Every trace only lists existing time_period UIDs; each event's tokens
-- resolve to existing anchor UIDs. The reader tolerates future deleted links.
DO $$
BEGIN
  IF EXISTS(
    SELECT 1 FROM silver.lrunes_time t CROSS JOIN LATERAL unnest(t.anchor_ids) x(uid)
    WHERE t.type='time_trace' AND NOT EXISTS(
      SELECT 1 FROM silver.lrunes_time e WHERE e.uid=x.uid AND e.type='time_period')
  ) THEN RAISE EXCEPTION 'Invalid migrated time_trace links for lrunes'; END IF;
  IF EXISTS(
    SELECT 1 FROM silver.lrunes_time t CROSS JOIN LATERAL unnest(t.anchor_ids) x(token)
    WHERE t.type='time_period' AND x.token !~ '^[0-9A-F]{4}(-([0-9A-F]{4}|0))?$'
  ) THEN RAISE EXCEPTION 'Malformed time_period anchor reference for lrunes'; END IF;
END $$;

DROP FUNCTION silver._cutover_time_segments(text,text[],text);
-- Original Time rows plus old-name -> new-UID audit remain in the private,
-- explicitly revoked backup table. No Cloudflare/Vercel/Neon operations.
COMMIT;
