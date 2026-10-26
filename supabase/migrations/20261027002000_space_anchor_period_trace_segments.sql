BEGIN;

SET LOCAL lock_timeout='10s';

SET LOCAL statement_timeout='90s';

LOCK TABLE silver.lo3rwang_trace, silver.lrunes_trace, silver.loc_trace IN ACCESS EXCLUSIVE MODE;

ALTER TABLE silver.lo3rwang_trace DISABLE TRIGGER USER;

ALTER TABLE silver.lo3rwang_trace DROP CONSTRAINT lo3rwang_trace_trace_type_check, DROP CONSTRAINT lo3rwang_trace_record_shape, DROP CONSTRAINT lo3rwang_trace_description_check, DROP CONSTRAINT lo3rwang_trace_radius_valid;

ALTER TABLE silver.lo3rwang_trace ADD COLUMN segment_list jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE silver.lo3rwang_trace ALTER COLUMN description DROP DEFAULT;

ALTER TABLE silver.lo3rwang_trace ALTER COLUMN description TYPE jsonb USING jsonb_build_object('text',description,'address',nullif(btrim(address),''));

ALTER TABLE silver.lo3rwang_trace ALTER COLUMN description SET DEFAULT '{}'::jsonb;

ALTER TABLE silver.lo3rwang_trace ALTER COLUMN address DROP DEFAULT;

ALTER TABLE silver.lo3rwang_trace ALTER COLUMN address DROP NOT NULL;

ALTER TABLE silver.lo3rwang_trace ALTER COLUMN address TYPE double precision[] USING CASE WHEN longitude IS NOT NULL AND latitude IS NOT NULL THEN ARRAY[longitude,latitude] ELSE NULL END;

UPDATE silver.lo3rwang_trace SET trace_type=CASE trace_type WHEN 'anchor' THEN 'space_anchor' WHEN 'map' THEN 'space_period' ELSE trace_type END;

ALTER TABLE silver.lo3rwang_trace ADD CONSTRAINT lo3rwang_trace_trace_type_check CHECK (trace_type IN ('space_anchor','space_period','space_trace'));

ALTER TABLE silver.lo3rwang_trace ADD CONSTRAINT lo3rwang_trace_description_json_object CHECK (jsonb_typeof(description)='object');

ALTER TABLE silver.lo3rwang_trace ADD CONSTRAINT lo3rwang_trace_segment_list_json_array CHECK (jsonb_typeof(segment_list)='array' AND jsonb_array_length(segment_list)<=400);

ALTER TABLE silver.lo3rwang_trace ADD CONSTRAINT lo3rwang_trace_address_coordinates CHECK (address IS NULL OR (array_ndims(address)=1 AND cardinality(address)=2 AND address[1] BETWEEN -180 AND 180 AND address[2] BETWEEN -90 AND 90));

ALTER TABLE silver.lo3rwang_trace ADD CONSTRAINT lo3rwang_trace_radius_valid CHECK (radius_m IS NULL OR (trace_type='space_anchor' AND radius_m BETWEEN 10 AND 20000000));

ALTER TABLE silver.lo3rwang_trace ADD CONSTRAINT lo3rwang_trace_record_shape CHECK (
 (trace_type='space_anchor' AND cardinality(anchor_list)=0 AND jsonb_array_length(segment_list)=0)
 OR (trace_type='space_period' AND address IS NULL AND cardinality(anchor_list) BETWEEN 2 AND 80 AND jsonb_array_length(segment_list)=0)
 OR (trace_type='space_trace' AND address IS NULL AND cardinality(anchor_list)=0 AND jsonb_array_length(segment_list) BETWEEN 1 AND 400)
 );

COMMENT ON COLUMN silver.lo3rwang_trace.address IS 'Optional [longitude,latitude] double precision[]; never a postal address.';

COMMENT ON COLUMN silver.lo3rwang_trace.description IS 'JSON object: original address at description.address; original notes at description.text.';

COMMENT ON COLUMN silver.lo3rwang_trace.anchor_list IS 'Ordered space_anchor UID queue, only on space_period records.';

COMMENT ON COLUMN silver.lo3rwang_trace.segment_list IS 'Independent [start_anchor_uid,end_anchor_uid] pairs on space_trace; no mandatory route and no inferred bridge.';

ALTER TABLE silver.lrunes_trace DISABLE TRIGGER USER;

ALTER TABLE silver.lrunes_trace DROP CONSTRAINT lrunes_trace_trace_type_check, DROP CONSTRAINT lrunes_trace_record_shape, DROP CONSTRAINT lrunes_trace_description_check, DROP CONSTRAINT lrunes_trace_radius_valid;

ALTER TABLE silver.lrunes_trace ADD COLUMN segment_list jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE silver.lrunes_trace ALTER COLUMN description DROP DEFAULT;

ALTER TABLE silver.lrunes_trace ALTER COLUMN description TYPE jsonb USING jsonb_build_object('text',description,'address',nullif(btrim(address),''));

ALTER TABLE silver.lrunes_trace ALTER COLUMN description SET DEFAULT '{}'::jsonb;

ALTER TABLE silver.lrunes_trace ALTER COLUMN address DROP DEFAULT;

ALTER TABLE silver.lrunes_trace ALTER COLUMN address DROP NOT NULL;

ALTER TABLE silver.lrunes_trace ALTER COLUMN address TYPE double precision[] USING CASE WHEN longitude IS NOT NULL AND latitude IS NOT NULL THEN ARRAY[longitude,latitude] ELSE NULL END;

UPDATE silver.lrunes_trace SET trace_type=CASE trace_type WHEN 'anchor' THEN 'space_anchor' WHEN 'map' THEN 'space_period' ELSE trace_type END;

ALTER TABLE silver.lrunes_trace ADD CONSTRAINT lrunes_trace_trace_type_check CHECK (trace_type IN ('space_anchor','space_period','space_trace'));

ALTER TABLE silver.lrunes_trace ADD CONSTRAINT lrunes_trace_description_json_object CHECK (jsonb_typeof(description)='object');

ALTER TABLE silver.lrunes_trace ADD CONSTRAINT lrunes_trace_segment_list_json_array CHECK (jsonb_typeof(segment_list)='array' AND jsonb_array_length(segment_list)<=400);

ALTER TABLE silver.lrunes_trace ADD CONSTRAINT lrunes_trace_address_coordinates CHECK (address IS NULL OR (array_ndims(address)=1 AND cardinality(address)=2 AND address[1] BETWEEN -180 AND 180 AND address[2] BETWEEN -90 AND 90));

ALTER TABLE silver.lrunes_trace ADD CONSTRAINT lrunes_trace_radius_valid CHECK (radius_m IS NULL OR (trace_type='space_anchor' AND radius_m BETWEEN 10 AND 20000000));

ALTER TABLE silver.lrunes_trace ADD CONSTRAINT lrunes_trace_record_shape CHECK (
 (trace_type='space_anchor' AND cardinality(anchor_list)=0 AND jsonb_array_length(segment_list)=0)
 OR (trace_type='space_period' AND address IS NULL AND cardinality(anchor_list) BETWEEN 2 AND 80 AND jsonb_array_length(segment_list)=0)
 OR (trace_type='space_trace' AND address IS NULL AND cardinality(anchor_list)=0 AND jsonb_array_length(segment_list) BETWEEN 1 AND 400)
 );

COMMENT ON COLUMN silver.lrunes_trace.address IS 'Optional [longitude,latitude] double precision[]; never a postal address.';

COMMENT ON COLUMN silver.lrunes_trace.description IS 'JSON object: original address at description.address; original notes at description.text.';

COMMENT ON COLUMN silver.lrunes_trace.anchor_list IS 'Ordered space_anchor UID queue, only on space_period records.';

COMMENT ON COLUMN silver.lrunes_trace.segment_list IS 'Independent [start_anchor_uid,end_anchor_uid] pairs on space_trace; no mandatory route and no inferred bridge.';

ALTER TABLE silver.loc_trace DISABLE TRIGGER USER;

ALTER TABLE silver.loc_trace DROP CONSTRAINT loc_trace_trace_type_check, DROP CONSTRAINT loc_trace_record_shape, DROP CONSTRAINT loc_trace_description_check, DROP CONSTRAINT loc_trace_radius_valid;

ALTER TABLE silver.loc_trace ADD COLUMN segment_list jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE silver.loc_trace ALTER COLUMN description DROP DEFAULT;

ALTER TABLE silver.loc_trace ALTER COLUMN description TYPE jsonb USING jsonb_build_object('text',description,'address',nullif(btrim(address),''));

ALTER TABLE silver.loc_trace ALTER COLUMN description SET DEFAULT '{}'::jsonb;

ALTER TABLE silver.loc_trace ALTER COLUMN address DROP DEFAULT;

ALTER TABLE silver.loc_trace ALTER COLUMN address DROP NOT NULL;

ALTER TABLE silver.loc_trace ALTER COLUMN address TYPE double precision[] USING CASE WHEN longitude IS NOT NULL AND latitude IS NOT NULL THEN ARRAY[longitude,latitude] ELSE NULL END;

UPDATE silver.loc_trace SET trace_type=CASE trace_type WHEN 'anchor' THEN 'space_anchor' WHEN 'map' THEN 'space_period' ELSE trace_type END;

ALTER TABLE silver.loc_trace ADD CONSTRAINT loc_trace_trace_type_check CHECK (trace_type IN ('space_anchor','space_period','space_trace'));

ALTER TABLE silver.loc_trace ADD CONSTRAINT loc_trace_description_json_object CHECK (jsonb_typeof(description)='object');

ALTER TABLE silver.loc_trace ADD CONSTRAINT loc_trace_segment_list_json_array CHECK (jsonb_typeof(segment_list)='array' AND jsonb_array_length(segment_list)<=400);

ALTER TABLE silver.loc_trace ADD CONSTRAINT loc_trace_address_coordinates CHECK (address IS NULL OR (array_ndims(address)=1 AND cardinality(address)=2 AND address[1] BETWEEN -180 AND 180 AND address[2] BETWEEN -90 AND 90));

ALTER TABLE silver.loc_trace ADD CONSTRAINT loc_trace_radius_valid CHECK (radius_m IS NULL OR (trace_type='space_anchor' AND radius_m BETWEEN 10 AND 20000000));

ALTER TABLE silver.loc_trace ADD CONSTRAINT loc_trace_record_shape CHECK (
 (trace_type='space_anchor' AND cardinality(anchor_list)=0 AND jsonb_array_length(segment_list)=0)
 OR (trace_type='space_period' AND address IS NULL AND cardinality(anchor_list) BETWEEN 2 AND 80 AND jsonb_array_length(segment_list)=0)
 OR (trace_type='space_trace' AND address IS NULL AND cardinality(anchor_list)=0 AND jsonb_array_length(segment_list) BETWEEN 1 AND 400)
 );

COMMENT ON COLUMN silver.loc_trace.address IS 'Optional [longitude,latitude] double precision[]; never a postal address.';

COMMENT ON COLUMN silver.loc_trace.description IS 'JSON object: original address at description.address; original notes at description.text.';

COMMENT ON COLUMN silver.loc_trace.anchor_list IS 'Ordered space_anchor UID queue, only on space_period records.';

COMMENT ON COLUMN silver.loc_trace.segment_list IS 'Independent [start_anchor_uid,end_anchor_uid] pairs on space_trace; no mandatory route and no inferred bridge.';

CREATE OR REPLACE FUNCTION silver.validate_scoped_trace_map() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'pg_catalog','silver' AS $fn$
DECLARE members text[]; available integer; owner_filter text := ''; referenced record;
BEGIN
 IF NEW.trace_type='space_anchor' THEN RETURN NEW; END IF;
 IF NEW.trace_type='space_period' THEN
   members:=NEW.anchor_list;
   IF EXISTS (SELECT 1 FROM unnest(members) AS u(id) WHERE id IS NULL OR id !~ '^[A-Za-z0-9]{4}$')
       OR (SELECT count(DISTINCT id) FROM unnest(members) AS u(id))<>cardinality(members)
   THEN RAISE EXCEPTION '路線包含空白、重複或不合法定錨點'; END IF;
 ELSIF NEW.trace_type='space_trace' THEN
   IF EXISTS (SELECT 1 FROM jsonb_array_elements(NEW.segment_list) AS e(pair)
      WHERE NOT CASE WHEN jsonb_typeof(e.pair)='array' THEN
          jsonb_array_length(e.pair)=2
          AND jsonb_typeof(e.pair->0)='string' AND jsonb_typeof(e.pair->1)='string'
          AND (e.pair->>0) ~ '^[A-Za-z0-9]{4}$'
          AND (e.pair->>1) ~ '^[A-Za-z0-9]{4}$'
          AND (e.pair->>0) <> (e.pair->>1)
        ELSE false END)
   THEN RAISE EXCEPTION '痕跡圖每段必須是兩個不同、有效的地點 UID'; END IF;
   SELECT array_agg(DISTINCT uid) INTO members FROM (
     SELECT e.pair->>0 AS uid FROM jsonb_array_elements(NEW.segment_list) AS e(pair)
     UNION ALL SELECT e.pair->>1 FROM jsonb_array_elements(NEW.segment_list) AS e(pair)
   ) used;
 ELSE RAISE EXCEPTION '未知空間資料類型'; END IF;
 IF TG_TABLE_NAME='loc_trace' THEN owner_filter:=' AND scope_id=$2'; END IF;
 EXECUTE format('SELECT count(*) FROM %I.%I WHERE trace_type=''space_anchor'' AND uid=ANY($1)%s',
    TG_TABLE_SCHEMA,TG_TABLE_NAME,owner_filter) INTO available USING members,NEW.scope_id;
 IF available<>coalesce(cardinality(members),0)
 THEN RAISE EXCEPTION '關聯引用不同 Scope 或不存在的地點'; END IF;
 RETURN NEW;
END $fn$;

CREATE OR REPLACE FUNCTION silver.protect_scoped_trace_anchor() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'pg_catalog','silver' AS $fn$
DECLARE linked boolean; owner_filter text := '';
BEGIN
 IF OLD.trace_type<>'space_anchor' THEN RETURN OLD; END IF;
 IF TG_TABLE_NAME='loc_trace' THEN owner_filter:=' AND m.scope_id=$2'; END IF;
 EXECUTE format($s$
   SELECT EXISTS (SELECT 1 FROM %I.%I m WHERE (
     (m.trace_type='space_period' AND $1=ANY(m.anchor_list))
     OR (m.trace_type='space_trace' AND EXISTS (
       SELECT 1 FROM jsonb_array_elements(m.segment_list) AS e(pair)
       WHERE e.pair->>0=$1 OR e.pair->>1=$1
     ))
   )%s)$s$,TG_TABLE_SCHEMA,TG_TABLE_NAME,owner_filter)
 INTO linked USING OLD.uid,OLD.scope_id;
 IF linked THEN RAISE EXCEPTION '地點仍被路線圖或痕跡圖引用，請先解除關聯'; END IF;
 RETURN OLD;
END $fn$;

CREATE OR REPLACE FUNCTION silver.sync_scope_trace_union() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','silver' AS $fn$
DECLARE origin text;
BEGIN
 IF TG_TABLE_SCHEMA<>'silver' THEN RAISE EXCEPTION 'Unsupported schema'; END IF;
 IF TG_TABLE_NAME='lo3rwang_trace' THEN origin:='lo3rwang';
 ELSIF TG_TABLE_NAME='lrunes_trace' THEN origin:='lrunes';
 ELSE RAISE EXCEPTION 'Unsupported Trace source'; END IF;
 IF TG_OP='DELETE' THEN
   DELETE FROM silver.loc_trace WHERE scope_id=origin AND uid=OLD.uid;
   RETURN OLD;
 END IF;
 INSERT INTO silver.loc_trace AS target
 (scope_id,uid,trace_type,title,description,longitude,latitude,radius_m,
 anchor_list,segment_list,created_at,times,county_id,"class",class_group,
 address,floor_label,floor_level,category)
 VALUES(origin,NEW.uid,NEW.trace_type,NEW.title,NEW.description,NEW.longitude,
 NEW.latitude,NEW.radius_m,NEW.anchor_list,NEW.segment_list,NEW.created_at,
 NEW.times,NEW.county_id,NEW."class",NEW.class_group,NEW.address,NEW.floor_label,
 NEW.floor_level,NEW.category)
 ON CONFLICT(scope_id,uid) DO UPDATE SET
 trace_type=excluded.trace_type,title=excluded.title,description=excluded.description,
 longitude=excluded.longitude,latitude=excluded.latitude,radius_m=excluded.radius_m,
 anchor_list=excluded.anchor_list,segment_list=excluded.segment_list,
 created_at=excluded.created_at,times=excluded.times,county_id=excluded.county_id,
 "class"=excluded."class",class_group=excluded.class_group,
 address=excluded.address,floor_label=excluded.floor_label,
 floor_level=excluded.floor_level,category=excluded.category;
 RETURN NEW;
END $fn$;

DO $rewrite$ DECLARE f record; definition text; BEGIN
 FOR f IN SELECT p.oid,p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='silver' AND p.proname IN (
 'apply_scope_trace_article_places','approve_scope_trace_place_alias',
 'merge_scope_trace_place_names','preview_scope_trace_article_places',
 'save_scope_trace_place_names','search_scope_trace_place_names',
 'trace_popular_anchors'
 ) LOOP
   definition:=pg_get_functiondef(f.oid);
   EXECUTE replace(replace(definition,'''anchor''','''space_anchor'''),'''map''','''space_period''');
 END LOOP;
END $rewrite$;

ALTER TABLE silver.lo3rwang_trace ENABLE TRIGGER USER;

ALTER TABLE silver.lrunes_trace ENABLE TRIGGER USER;

ALTER TABLE silver.loc_trace ENABLE TRIGGER USER;

DO $check$ BEGIN
 IF (SELECT count(*) FROM silver.lo3rwang_trace)<>582
    OR (SELECT count(*) FROM silver.loc_trace WHERE scope_id='lo3rwang')<>582
    OR (SELECT count(*) FROM silver.lo3rwang_trace WHERE trace_type='space_anchor')<>581
    OR (SELECT count(*) FROM silver.lo3rwang_trace WHERE trace_type='space_period')<>1
    OR (SELECT count(*) FROM silver.lo3rwang_trace WHERE description->>'address' IS NOT NULL)<>8
    OR (SELECT count(*) FROM silver.lo3rwang_trace WHERE address IS NOT NULL)<>581
    OR (SELECT count(*) FROM silver.trace_uid_migration_backup)<>582
 THEN RAISE EXCEPTION 'Trace data preservation verification failed'; END IF;
END $check$;

COMMIT;