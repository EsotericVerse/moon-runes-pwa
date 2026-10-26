BEGIN;

SET LOCAL lock_timeout='8s';

SET LOCAL statement_timeout='45s';

DO $verify$ BEGIN
 IF EXISTS(SELECT 1 FROM silver.lo3rwang_trace WHERE trace_type='space_trace' OR jsonb_array_length(segment_list)<>0)
 OR EXISTS(SELECT 1 FROM silver.lrunes_trace WHERE trace_type='space_trace' OR jsonb_array_length(segment_list)<>0)
 OR EXISTS(SELECT 1 FROM silver.loc_trace WHERE trace_type='space_trace' OR jsonb_array_length(segment_list)<>0)
 THEN RAISE EXCEPTION 'Nonempty segment_list detected: manual preservation conversion required'; END IF;
END $verify$;

ALTER TABLE silver.lo3rwang_trace DROP CONSTRAINT lo3rwang_trace_record_shape, DROP CONSTRAINT lo3rwang_trace_segment_list_json_array;

ALTER TABLE silver.lo3rwang_trace ALTER COLUMN segment_list DROP DEFAULT;

ALTER TABLE silver.lo3rwang_trace ALTER COLUMN segment_list TYPE text[][] USING ARRAY[]::text[][];

ALTER TABLE silver.lo3rwang_trace ALTER COLUMN segment_list SET DEFAULT '{}'::text[][];

ALTER TABLE silver.lo3rwang_trace ADD CONSTRAINT lo3rwang_trace_segment_list_pair_array CHECK (cardinality(segment_list)=0 OR (array_ndims(segment_list)=2 AND array_length(segment_list,2)=2 AND array_length(segment_list,1) BETWEEN 1 AND 400));

ALTER TABLE silver.lo3rwang_trace ADD CONSTRAINT lo3rwang_trace_record_shape CHECK (
 (trace_type='space_anchor' AND cardinality(anchor_list)=0 AND cardinality(segment_list)=0)
 OR (trace_type='space_period' AND address IS NULL AND cardinality(anchor_list) BETWEEN 2 AND 80 AND cardinality(segment_list)=0)
 OR (trace_type='space_trace' AND address IS NULL AND cardinality(anchor_list)=0 AND cardinality(segment_list) BETWEEN 2 AND 800 AND array_length(segment_list,2)=2)
);

COMMENT ON COLUMN silver.lo3rwang_trace.segment_list IS 'Two-dimensional text array of independent [start_anchor_UID,end_anchor_UID] pairs. No route dependency or segment ordering required.';

ALTER TABLE silver.lrunes_trace DROP CONSTRAINT lrunes_trace_record_shape, DROP CONSTRAINT lrunes_trace_segment_list_json_array;

ALTER TABLE silver.lrunes_trace ALTER COLUMN segment_list DROP DEFAULT;

ALTER TABLE silver.lrunes_trace ALTER COLUMN segment_list TYPE text[][] USING ARRAY[]::text[][];

ALTER TABLE silver.lrunes_trace ALTER COLUMN segment_list SET DEFAULT '{}'::text[][];

ALTER TABLE silver.lrunes_trace ADD CONSTRAINT lrunes_trace_segment_list_pair_array CHECK (cardinality(segment_list)=0 OR (array_ndims(segment_list)=2 AND array_length(segment_list,2)=2 AND array_length(segment_list,1) BETWEEN 1 AND 400));

ALTER TABLE silver.lrunes_trace ADD CONSTRAINT lrunes_trace_record_shape CHECK (
 (trace_type='space_anchor' AND cardinality(anchor_list)=0 AND cardinality(segment_list)=0)
 OR (trace_type='space_period' AND address IS NULL AND cardinality(anchor_list) BETWEEN 2 AND 80 AND cardinality(segment_list)=0)
 OR (trace_type='space_trace' AND address IS NULL AND cardinality(anchor_list)=0 AND cardinality(segment_list) BETWEEN 2 AND 800 AND array_length(segment_list,2)=2)
);

COMMENT ON COLUMN silver.lrunes_trace.segment_list IS 'Two-dimensional text array of independent [start_anchor_UID,end_anchor_UID] pairs. No route dependency or segment ordering required.';

ALTER TABLE silver.loc_trace DROP CONSTRAINT loc_trace_record_shape, DROP CONSTRAINT loc_trace_segment_list_json_array;

ALTER TABLE silver.loc_trace ALTER COLUMN segment_list DROP DEFAULT;

ALTER TABLE silver.loc_trace ALTER COLUMN segment_list TYPE text[][] USING ARRAY[]::text[][];

ALTER TABLE silver.loc_trace ALTER COLUMN segment_list SET DEFAULT '{}'::text[][];

ALTER TABLE silver.loc_trace ADD CONSTRAINT loc_trace_segment_list_pair_array CHECK (cardinality(segment_list)=0 OR (array_ndims(segment_list)=2 AND array_length(segment_list,2)=2 AND array_length(segment_list,1) BETWEEN 1 AND 400));

ALTER TABLE silver.loc_trace ADD CONSTRAINT loc_trace_record_shape CHECK (
 (trace_type='space_anchor' AND cardinality(anchor_list)=0 AND cardinality(segment_list)=0)
 OR (trace_type='space_period' AND address IS NULL AND cardinality(anchor_list) BETWEEN 2 AND 80 AND cardinality(segment_list)=0)
 OR (trace_type='space_trace' AND address IS NULL AND cardinality(anchor_list)=0 AND cardinality(segment_list) BETWEEN 2 AND 800 AND array_length(segment_list,2)=2)
);

COMMENT ON COLUMN silver.loc_trace.segment_list IS 'Two-dimensional text array of independent [start_anchor_UID,end_anchor_UID] pairs. No route dependency or segment ordering required.';

CREATE OR REPLACE FUNCTION silver.validate_scoped_trace_map() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'pg_catalog','silver' AS $fn$
DECLARE members text[]; available integer; sql text;
BEGIN
 IF NEW.trace_type='space_anchor' THEN RETURN NEW; END IF;
 IF NEW.trace_type='space_period' THEN
   members:=NEW.anchor_list;
   IF EXISTS(SELECT 1 FROM unnest(members) AS u(id)
     WHERE id IS NULL OR id !~ '^[A-Za-z0-9]{4}$')
     OR (SELECT count(DISTINCT id) FROM unnest(members) AS u(id))
       <> cardinality(members)
   THEN RAISE EXCEPTION '路線包含空白、重複或無效地點 UID'; END IF;
 ELSIF NEW.trace_type='space_trace' THEN
   IF array_ndims(NEW.segment_list)<>2 OR array_length(NEW.segment_list,2)<>2
   THEN RAISE EXCEPTION '痕跡圖線段必須是每列兩個 UID 的陣列'; END IF;
   IF EXISTS (SELECT 1 FROM generate_subscripts(NEW.segment_list,1) AS x(i)
     WHERE (NEW.segment_list)[x.i][1] IS NULL
       OR (NEW.segment_list)[x.i][2] IS NULL
       OR (NEW.segment_list)[x.i][1] !~ '^[A-Za-z0-9]{4}$'
       OR (NEW.segment_list)[x.i][2] !~ '^[A-Za-z0-9]{4}$'
       OR (NEW.segment_list)[x.i][1] = (NEW.segment_list)[x.i][2])
   THEN RAISE EXCEPTION '痕跡圖線段起點、終點必須是兩個不同且有效的地點'; END IF;
   SELECT array_agg(DISTINCT id) INTO members
   FROM unnest(NEW.segment_list) AS u(id);
 ELSE RAISE EXCEPTION '不支援的空間資料類型'; END IF;
 sql:=format('SELECT count(*) FROM %I.%I WHERE trace_type=''space_anchor'' AND uid=ANY($1)%s',
 TG_TABLE_SCHEMA,TG_TABLE_NAME,
 CASE WHEN TG_TABLE_NAME='loc_trace' THEN ' AND scope_id=$2' ELSE '' END);
 IF TG_TABLE_NAME='loc_trace' THEN
   EXECUTE sql INTO available USING members,NEW.scope_id;
 ELSE
   EXECUTE sql INTO available USING members;
 END IF;
 IF available <> coalesce(cardinality(members),0)
 THEN RAISE EXCEPTION '線段引用了同一 Scope 之外或不存在的地點'; END IF;
 RETURN NEW;
END $fn$;

CREATE OR REPLACE FUNCTION silver.protect_scoped_trace_anchor() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'pg_catalog','silver' AS $fn$
DECLARE linked boolean; sql text;
BEGIN
 IF OLD.trace_type<>'space_anchor' THEN RETURN OLD; END IF;
 sql:=format($s$SELECT EXISTS(SELECT 1 FROM %I.%I m WHERE (
 (m.trace_type='space_period' AND $1=ANY(m.anchor_list))
 OR (m.trace_type='space_trace' AND $1=ANY(m.segment_list))
 )%s)$s$,TG_TABLE_SCHEMA,TG_TABLE_NAME,
 CASE WHEN TG_TABLE_NAME='loc_trace' THEN ' AND m.scope_id=$2' ELSE '' END);
 IF TG_TABLE_NAME='loc_trace' THEN EXECUTE sql INTO linked USING OLD.uid,OLD.scope_id;
 ELSE EXECUTE sql INTO linked USING OLD.uid; END IF;
 IF linked THEN RAISE EXCEPTION '地點仍被路線或痕跡圖使用，請先解除線段關聯'; END IF;
 RETURN OLD;
END $fn$;

DO $assert$ BEGIN
 IF (SELECT count(*) FROM silver.lo3rwang_trace WHERE trace_type='space_anchor')<>581
 OR (SELECT count(*) FROM silver.lo3rwang_trace WHERE trace_type='space_period')<>1
 OR (SELECT count(*) FROM silver.loc_trace WHERE scope_id='lo3rwang')<>582
 OR (SELECT count(*) FROM silver.trace_uid_migration_backup)<>582
 THEN RAISE EXCEPTION 'Spatial trace array migration data integrity mismatch'; END IF;
END $assert$;

COMMIT;