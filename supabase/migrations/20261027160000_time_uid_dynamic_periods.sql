-- Canonical Time cutover. Apply atomically only as part of a synchronized
-- manual release: the currently served client still queries legacy columns.
-- Persist a lossless, append-only snapshot BEFORE dropping any live columns.
BEGIN;

CREATE TABLE IF NOT EXISTS silver.time_uid_cutover_backup (
  scope_id text NOT NULL,
  old_record_id uuid NOT NULL,
  old_resource_id text,
  new_uid varchar(4),
  original_row jsonb NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(scope_id,old_record_id)
);
REVOKE ALL ON silver.time_uid_cutover_backup FROM PUBLIC,anon,authenticated;

INSERT INTO silver.time_uid_cutover_backup (scope_id,old_record_id,old_resource_id,original_row)
SELECT 'lo3rwang',record_id,resource_id,to_jsonb(t) FROM silver.lo3rwang_time t
UNION ALL
SELECT 'lrunes',record_id,resource_id,to_jsonb(t) FROM silver.lrunes_time t
ON CONFLICT(scope_id,old_record_id) DO NOTHING;

ALTER TABLE silver.lo3rwang_time ADD COLUMN uid varchar(4);
ALTER TABLE silver.lrunes_time ADD COLUMN uid varchar(4);

WITH numbered AS (
 SELECT record_id,upper(lpad(to_hex(row_number() OVER (
 ORDER BY record_type, time_date NULLS LAST,resource_id,record_id)::integer),4,'0')) AS assigned_uid
 FROM silver.lo3rwang_time
)
UPDATE silver.lo3rwang_time t SET uid=n.assigned_uid FROM numbered n WHERE t.record_id=n.record_id;

WITH numbered AS (
 SELECT record_id,upper(lpad(to_hex(row_number() OVER (
 ORDER BY record_type,time_date NULLS LAST,resource_id,record_id)::integer),4,'0')) AS assigned_uid
 FROM silver.lrunes_time
)
UPDATE silver.lrunes_time t SET uid=n.assigned_uid FROM numbered n WHERE t.record_id=n.record_id;

UPDATE silver.time_uid_cutover_backup b SET new_uid=t.uid
FROM silver.lo3rwang_time t
WHERE b.scope_id='lo3rwang' AND b.old_record_id=t.record_id;
UPDATE silver.time_uid_cutover_backup b SET new_uid=t.uid
FROM silver.lrunes_time t
WHERE b.scope_id='lrunes' AND b.old_record_id=t.record_id;

DO $$
BEGIN
  IF (SELECT count(*) FROM silver.lo3rwang_time)<>(
      SELECT count(*) FROM silver.time_uid_cutover_backup WHERE scope_id='lo3rwang')
    OR (SELECT count(*) FROM silver.lrunes_time)<>(
      SELECT count(*) FROM silver.time_uid_cutover_backup WHERE scope_id='lrunes')
    OR EXISTS (SELECT 1 FROM silver.time_uid_cutover_backup WHERE new_uid IS NULL) THEN
    RAISE EXCEPTION 'Time migration backup or UID mapping incomplete';
  END IF;
END $$;

CREATE FUNCTION silver._time_remap_legacy_refs(p_refs text[],p_kind text,p_map jsonb)
RETURNS text[] LANGUAGE plpgsql AS $$
DECLARE
  v_values text[] := ARRAY[]::text[];
  v_out text[] := ARRAY[]::text[];
  v_size integer := coalesce(cardinality(p_refs),0);
  v_old text;
  v_uid text;
  v_start text;
  v_next text;
  i integer;
BEGIN
  IF v_size=0 THEN RETURN p_refs; END IF;
  FOR i IN 1..v_size LOOP
    v_old:=p_refs[i];
    IF v_old='0' THEN
      v_uid:='0';
    ELSE
      v_uid:=p_map->>v_old;
      IF v_uid IS NULL OR v_uid !~ '^[0-9A-F]{4}$' THEN
        RAISE EXCEPTION 'Broken Time anchor reference: %',v_old;
      END IF;
    END IF;
    v_values:=array_append(v_values,v_uid);
  END LOOP;
  IF p_kind='period' THEN
    IF v_size>2 THEN RAISE EXCEPTION 'Legacy period has too many endpoints'; END IF;
    IF v_values[1]='0' THEN RAISE EXCEPTION 'Period cannot start without a real anchor'; END IF;
    IF v_size=1 THEN RETURN ARRAY[v_values[1]]; END IF;
    RETURN ARRAY[v_values[1]||'-'||v_values[2]];
  END IF;
  IF p_kind='event' THEN
    IF v_size=1 THEN RETURN ARRAY[v_values[1]]; END IF;
    -- Multi-anchor historical events remain connected through each pair,
    -- without erasing intermediate anchors.
    FOR i IN 1..(v_size-1) LOOP
      IF v_values[i]='0' OR v_values[i+1]='0' THEN
        RAISE EXCEPTION 'Unexpected open boundary in legacy event';
      END IF;
      v_out:=array_append(v_out,v_values[i]||'-'||v_values[i+1]);
    END LOOP;
    RETURN v_out;
  END IF;
  -- No style label remains in active Time; the immutable backup holds its text.
  RETURN v_values;
END $$;

WITH anchor_map AS (
 SELECT jsonb_object_agg(resource_id,uid) AS ids
 FROM silver.lo3rwang_time WHERE record_type='anchor'
)
UPDATE silver.lo3rwang_time t SET anchor_ids=
 silver._time_remap_legacy_refs(t.anchor_ids,t.record_type,(SELECT ids FROM anchor_map))
WHERE t.record_type IN ('period','event') AND t.anchor_ids IS NOT NULL;

WITH anchor_map AS (
 SELECT jsonb_object_agg(resource_id,uid) AS ids
 FROM silver.lrunes_time WHERE record_type='anchor'
)
UPDATE silver.lrunes_time t SET anchor_ids=
 silver._time_remap_legacy_refs(t.anchor_ids,t.record_type,(SELECT ids FROM anchor_map))
WHERE t.record_type IN ('period','event') AND t.anchor_ids IS NOT NULL;

DROP FUNCTION silver._time_remap_legacy_refs(text[],text,jsonb);

ALTER TABLE silver.lo3rwang_time
 DROP CONSTRAINT lo3rwang_time_style_comment_shape_check,
 DROP CONSTRAINT lo3rwang_time_record_type_check,
 DROP CONSTRAINT lo3rwang_time_record_type_resource_id_key,
 DROP CONSTRAINT lo3rwang_time_pkey;
ALTER TABLE silver.lrunes_time
 DROP CONSTRAINT lrunes_time_style_comment_shape_check,
 DROP CONSTRAINT lrunes_time_record_type_check,
 DROP CONSTRAINT lrunes_time_record_type_resource_id_key,
 DROP CONSTRAINT lrunes_time_pkey;

-- Historical style_comment data is preserved in time_uid_cutover_backup.
DELETE FROM silver.lo3rwang_time WHERE record_type='style_comment';
DELETE FROM silver.lrunes_time WHERE record_type='style_comment';

UPDATE silver.lo3rwang_time
 SET note=CASE
   WHEN nullif(btrim(note),'') IS NULL THEN nullif(style_description,'')
   WHEN nullif(btrim(style_description),'') IS NULL THEN note
   ELSE note||E'\n'||style_description END;
UPDATE silver.lrunes_time
 SET note=CASE
   WHEN nullif(btrim(note),'') IS NULL THEN nullif(style_description,'')
   WHEN nullif(btrim(style_description),'') IS NULL THEN note
   ELSE note||E'\n'||style_description END;

DROP INDEX IF EXISTS silver.lo3rwang_time_order_idx;
DROP INDEX IF EXISTS silver.lo3rwang_time_style_comment_lookup_idx;
DROP INDEX IF EXISTS silver.lrunes_time_order_idx;
DROP INDEX IF EXISTS silver.lrunes_time_style_comment_lookup_idx;

ALTER TABLE silver.lo3rwang_time
 RENAME COLUMN record_type TO type;
ALTER TABLE silver.lo3rwang_time
 RENAME COLUMN label TO title;
ALTER TABLE silver.lo3rwang_time
 RENAME COLUMN note TO description;

ALTER TABLE silver.lrunes_time
 RENAME COLUMN record_type TO type;
ALTER TABLE silver.lrunes_time
 RENAME COLUMN label TO title;
ALTER TABLE silver.lrunes_time
 RENAME COLUMN note TO description;

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
 ADD CONSTRAINT lo3rwang_time_type_check CHECK(type IN ('anchor','period','event')),
 ADD CONSTRAINT lo3rwang_time_anchor_date_check CHECK(type <> 'anchor' OR time_date IS NOT NULL);

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
 ADD CONSTRAINT lrunes_time_type_check CHECK(type IN ('anchor','period','event')),
 ADD CONSTRAINT lrunes_time_anchor_date_check CHECK(type <> 'anchor' OR time_date IS NOT NULL);

-- Keep existing Scope RLS rules and GRANTs. UID collision is rejected by PK.
-- No FK cascade: deleting an anchor only invalidates references that point at it.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM silver.lo3rwang_time t
    WHERE t.type='period' AND
      (t.anchor_ids IS NULL OR cardinality(t.anchor_ids)=0)
  ) OR EXISTS (
    SELECT 1 FROM silver.lrunes_time t
    WHERE t.type='period' AND
      (t.anchor_ids IS NULL OR cardinality(t.anchor_ids)=0)
  ) THEN RAISE EXCEPTION 'A migrated period has no anchor references'; END IF;
END $$;
COMMIT;
