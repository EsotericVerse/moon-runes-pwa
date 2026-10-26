BEGIN;

SET LOCAL lock_timeout='10s';

SET LOCAL statement_timeout='90s';

LOCK TABLE silver.lo3rwang_trace,silver.lrunes_trace,silver.loc_trace IN ACCESS EXCLUSIVE MODE;

DO $guard$ BEGIN
 IF EXISTS (SELECT 1 FROM silver.lo3rwang_trace WHERE trace_type='space_trace' AND cardinality(segment_list)<>0)
 OR EXISTS(SELECT 1 FROM silver.lrunes_trace WHERE trace_type='space_trace' AND cardinality(segment_list)<>0)
 OR EXISTS(SELECT 1 FROM silver.loc_trace WHERE trace_type='space_trace' AND cardinality(segment_list)<>0)
 THEN RAISE EXCEPTION 'Existing segments require a verified manual 2D conversion'; END IF;
 IF (SELECT count(*) FROM silver.trace_uid_migration_backup)<>582
 THEN RAISE EXCEPTION 'Original Trace backup is missing'; END IF;
END $guard$;

ALTER TABLE silver.lo3rwang_trace DISABLE TRIGGER USER;

ALTER TABLE silver.lo3rwang_trace DROP CONSTRAINT lo3rwang_trace_record_shape, DROP CONSTRAINT lo3rwang_trace_trace_type_check, DROP CONSTRAINT lo3rwang_trace_radius_valid, DROP CONSTRAINT lo3rwang_trace_segment_list_pair_array;

UPDATE silver.lo3rwang_trace SET trace_type='space_road' WHERE trace_type='space_period';

ALTER TABLE silver.lo3rwang_trace ADD CONSTRAINT lo3rwang_trace_trace_type_check CHECK (trace_type IN ('space_anchor','space_road','space_trace'));

ALTER TABLE silver.lo3rwang_trace ADD CONSTRAINT lo3rwang_trace_record_shape CHECK (
  (trace_type='space_anchor' AND cardinality(anchor_list)=0 AND (address IS NULL OR cardinality(address)=2))
  OR (trace_type='space_road' AND address IS NULL AND array_ndims(anchor_list)=1 AND cardinality(anchor_list) BETWEEN 2 AND 80)
  OR (trace_type='space_trace' AND address IS NULL AND array_ndims(anchor_list)=2 AND array_length(anchor_list,2)=2 AND array_length(anchor_list,1) BETWEEN 1 AND 400)
 );

ALTER TABLE silver.lo3rwang_trace ADD CONSTRAINT lo3rwang_trace_radius_valid CHECK (radius_m IS NULL OR (trace_type='space_anchor' AND radius_m BETWEEN 10 AND 20000000));

ALTER TABLE silver.lo3rwang_trace DROP COLUMN segment_list;

ALTER TABLE silver.lo3rwang_trace DROP COLUMN created_at, DROP COLUMN county_id, DROP COLUMN floor_label, DROP COLUMN floor_level, DROP COLUMN category, DROP COLUMN "class", DROP COLUMN class_group, DROP COLUMN longitude, DROP COLUMN latitude;

COMMENT ON COLUMN silver.lo3rwang_trace.anchor_list IS 'space_road: ordered text[] of anchor UID; space_trace: text[][] of independent endpoint pairs; space_anchor: empty array';

ALTER TABLE silver.lrunes_trace DISABLE TRIGGER USER;

ALTER TABLE silver.lrunes_trace DROP CONSTRAINT lrunes_trace_record_shape, DROP CONSTRAINT lrunes_trace_trace_type_check, DROP CONSTRAINT lrunes_trace_radius_valid, DROP CONSTRAINT lrunes_trace_segment_list_pair_array;

UPDATE silver.lrunes_trace SET trace_type='space_road' WHERE trace_type='space_period';

ALTER TABLE silver.lrunes_trace ADD CONSTRAINT lrunes_trace_trace_type_check CHECK (trace_type IN ('space_anchor','space_road','space_trace'));

ALTER TABLE silver.lrunes_trace ADD CONSTRAINT lrunes_trace_record_shape CHECK (
  (trace_type='space_anchor' AND cardinality(anchor_list)=0 AND (address IS NULL OR cardinality(address)=2))
  OR (trace_type='space_road' AND address IS NULL AND array_ndims(anchor_list)=1 AND cardinality(anchor_list) BETWEEN 2 AND 80)
  OR (trace_type='space_trace' AND address IS NULL AND array_ndims(anchor_list)=2 AND array_length(anchor_list,2)=2 AND array_length(anchor_list,1) BETWEEN 1 AND 400)
 );

ALTER TABLE silver.lrunes_trace ADD CONSTRAINT lrunes_trace_radius_valid CHECK (radius_m IS NULL OR (trace_type='space_anchor' AND radius_m BETWEEN 10 AND 20000000));

ALTER TABLE silver.lrunes_trace DROP COLUMN segment_list;

ALTER TABLE silver.lrunes_trace DROP COLUMN created_at, DROP COLUMN county_id, DROP COLUMN floor_label, DROP COLUMN floor_level, DROP COLUMN category, DROP COLUMN "class", DROP COLUMN class_group, DROP COLUMN longitude, DROP COLUMN latitude;

COMMENT ON COLUMN silver.lrunes_trace.anchor_list IS 'space_road: ordered text[] of anchor UID; space_trace: text[][] of independent endpoint pairs; space_anchor: empty array';

ALTER TABLE silver.loc_trace DISABLE TRIGGER USER;

ALTER TABLE silver.loc_trace DROP CONSTRAINT loc_trace_record_shape, DROP CONSTRAINT loc_trace_trace_type_check, DROP CONSTRAINT loc_trace_radius_valid, DROP CONSTRAINT loc_trace_segment_list_pair_array;

UPDATE silver.loc_trace SET trace_type='space_road' WHERE trace_type='space_period';

ALTER TABLE silver.loc_trace ADD CONSTRAINT loc_trace_trace_type_check CHECK (trace_type IN ('space_anchor','space_road','space_trace'));

ALTER TABLE silver.loc_trace ADD CONSTRAINT loc_trace_record_shape CHECK (
  (trace_type='space_anchor' AND cardinality(anchor_list)=0 AND (address IS NULL OR cardinality(address)=2))
  OR (trace_type='space_road' AND address IS NULL AND array_ndims(anchor_list)=1 AND cardinality(anchor_list) BETWEEN 2 AND 80)
  OR (trace_type='space_trace' AND address IS NULL AND array_ndims(anchor_list)=2 AND array_length(anchor_list,2)=2 AND array_length(anchor_list,1) BETWEEN 1 AND 400)
 );

ALTER TABLE silver.loc_trace ADD CONSTRAINT loc_trace_radius_valid CHECK (radius_m IS NULL OR (trace_type='space_anchor' AND radius_m BETWEEN 10 AND 20000000));

ALTER TABLE silver.loc_trace DROP COLUMN segment_list;

ALTER TABLE silver.loc_trace DROP COLUMN created_at, DROP COLUMN county_id, DROP COLUMN floor_label, DROP COLUMN floor_level, DROP COLUMN category, DROP COLUMN "class", DROP COLUMN class_group, DROP COLUMN longitude, DROP COLUMN latitude;

COMMENT ON COLUMN silver.loc_trace.anchor_list IS 'space_road: ordered text[] of anchor UID; space_trace: text[][] of independent endpoint pairs; space_anchor: empty array';

CREATE OR REPLACE FUNCTION silver.validate_scoped_trace_map() RETURNS trigger
 LANGUAGE plpgsql SET search_path TO 'pg_catalog','silver' AS $fn$
DECLARE member_ids text[]; available integer; query text;
BEGIN
 IF NEW.trace_type='space_anchor' THEN RETURN NEW; END IF;
 IF NEW.trace_type='space_road' THEN
   IF array_ndims(NEW.anchor_list)<>1 OR cardinality(NEW.anchor_list) NOT BETWEEN 2 AND 80
   THEN RAISE EXCEPTION '路線必須是至少兩個有先後順序的地點 UID'; END IF;
   IF (SELECT count(DISTINCT id) FROM unnest(NEW.anchor_list) AS u(id))<>cardinality(NEW.anchor_list)
   THEN RAISE EXCEPTION '一條路線不能重複加入相同地點'; END IF;
 ELSIF NEW.trace_type='space_trace' THEN
   IF array_ndims(NEW.anchor_list)<>2 OR array_length(NEW.anchor_list,2)<>2
      OR array_length(NEW.anchor_list,1) NOT BETWEEN 1 AND 400
   THEN RAISE EXCEPTION '痕跡圖只能儲存起點與終點兩兩配對的二維陣列'; END IF;
   IF EXISTS(SELECT 1 FROM generate_subscripts(NEW.anchor_list,1) g(i)
     WHERE NEW.anchor_list[g.i][1] IS NULL OR NEW.anchor_list[g.i][2] IS NULL
       OR NEW.anchor_list[g.i][1] = NEW.anchor_list[g.i][2])
   THEN RAISE EXCEPTION '每段線必須有兩個不同的有效端點'; END IF;
 ELSE RAISE EXCEPTION '無效 Trace 類型'; END IF;
 IF EXISTS(SELECT 1 FROM unnest(NEW.anchor_list) a(id) WHERE id IS NULL OR id !~ '^[A-Za-z0-9]{4}$')
 THEN RAISE EXCEPTION '引用的地點 UID 格式無效'; END IF;
 SELECT array_agg(DISTINCT id) INTO member_ids FROM unnest(NEW.anchor_list) a(id);
 query:=format('SELECT count(*) FROM %I.%I WHERE trace_type=''space_anchor'' AND uid=ANY($1)%s',
 TG_TABLE_SCHEMA,TG_TABLE_NAME,CASE WHEN TG_TABLE_NAME='loc_trace' THEN ' AND scope_id=$2' ELSE '' END);
 IF TG_TABLE_NAME='loc_trace' THEN EXECUTE query INTO available USING member_ids,NEW.scope_id;
 ELSE EXECUTE query INTO available USING member_ids; END IF;
 IF available<>coalesce(cardinality(member_ids),0) THEN
   RAISE EXCEPTION '不能引用不存在的地點或跨 Scope 的定錨點';
 END IF;
 RETURN NEW;
END $fn$;

CREATE OR REPLACE FUNCTION silver.protect_scoped_trace_anchor() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'pg_catalog','silver' AS $fn$
DECLARE linked boolean; query text;
BEGIN
 IF OLD.trace_type<>'space_anchor' THEN RETURN OLD; END IF;
 query:=format('SELECT EXISTS(SELECT 1 FROM %I.%I m WHERE m.trace_type IN (''space_road'',''space_trace'')
 AND $1=ANY(m.anchor_list)%s)',TG_TABLE_SCHEMA,TG_TABLE_NAME,
 CASE WHEN TG_TABLE_NAME='loc_trace' THEN ' AND m.scope_id=$2' ELSE '' END);
 IF TG_TABLE_NAME='loc_trace' THEN EXECUTE query INTO linked USING OLD.uid,OLD.scope_id;
 ELSE EXECUTE query INTO linked USING OLD.uid; END IF;
 IF linked THEN RAISE EXCEPTION '地點仍被路線或痕跡引用，請先解除關聯'; END IF;
 RETURN OLD;
END $fn$;

CREATE OR REPLACE FUNCTION silver.sync_scope_trace_union() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','silver' AS $fn$
DECLARE origin text;
BEGIN
 IF TG_TABLE_SCHEMA<>'silver' THEN RAISE EXCEPTION 'Unsupported trace source schema'; END IF;
 IF TG_TABLE_NAME='lo3rwang_trace' THEN origin:='lo3rwang';
 ELSIF TG_TABLE_NAME='lrunes_trace' THEN origin:='lrunes';
 ELSE RAISE EXCEPTION 'Unsupported trace source'; END IF;
 IF TG_OP='DELETE' THEN
   DELETE FROM silver.loc_trace WHERE scope_id=origin AND uid=OLD.uid;
   RETURN OLD;
 END IF;
 INSERT INTO silver.loc_trace AS target
 (scope_id,uid,trace_type,title,description,address,anchor_list,times,radius_m)
 VALUES(origin,NEW.uid,NEW.trace_type,NEW.title,NEW.description,NEW.address,
 NEW.anchor_list,NEW.times,NEW.radius_m)
 ON CONFLICT(scope_id,uid) DO UPDATE SET
 trace_type=EXCLUDED.trace_type,title=EXCLUDED.title,description=EXCLUDED.description,
 address=EXCLUDED.address,anchor_list=EXCLUDED.anchor_list,times=EXCLUDED.times,radius_m=EXCLUDED.radius_m;
 RETURN NEW;
END $fn$;

DROP FUNCTION IF EXISTS silver.trace_popular_anchors(text,integer);

DROP FUNCTION IF EXISTS silver.merge_scoped_trace_anchors(text,text,text,text);

DROP FUNCTION IF EXISTS silver.search_scope_trace_place_names(text,text,integer);

CREATE FUNCTION silver.search_scope_trace_place_names(p_scope_id text,p_term text,p_limit integer DEFAULT 8)
 RETURNS TABLE(uid varchar(4),title text,address double precision[])
 LANGUAGE plpgsql STABLE SECURITY INVOKER
 SET search_path TO 'pg_catalog','silver' AS $fn$
DECLARE term text; query text;
BEGIN
 IF p_scope_id NOT IN ('lo3rwang','lrunes','loc') OR nullif(btrim(p_term),'') IS NULL THEN RETURN; END IF;
 term:='%'||replace(replace(replace(left(btrim(p_term),100),'\\','\\\\'),'%','\\%'),'_','\\_')||'%';
 query:=format($sql$
 SELECT a.uid,a.title,a.address FROM silver.%I a
 LEFT JOIN silver.%I n ON n.uid=a.uid
 WHERE a.trace_type='space_anchor' %s
 AND (a.title ILIKE $1 OR EXISTS(SELECT 1 FROM unnest(coalesce(n.name_lists,'{}'::text[])) name WHERE name ILIKE $1))
 ORDER BY a.title,a.uid LIMIT $2
 $sql$,p_scope_id||'_trace',p_scope_id||'_place',
 CASE WHEN p_scope_id='loc' THEN 'AND a.scope_id=''loc''' ELSE '' END);
 RETURN QUERY EXECUTE query USING term,least(greatest(coalesce(p_limit,8),1),8);
END $fn$;

GRANT EXECUTE ON FUNCTION silver.search_scope_trace_place_names(text,text,integer) TO anon,authenticated;

CREATE OR REPLACE FUNCTION silver.merge_scope_trace_place_names(
 p_scope_id text,p_keep_uid varchar,p_remove_uids varchar[]) RETURNS integer
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','silver' AS $fn$
DECLARE table_name text; place_table text; count_matches integer; all_names text[]; remove_uid text;
BEGIN
 IF p_scope_id NOT IN ('lo3rwang','lrunes','loc') OR NOT silver.can_manage_scope(p_scope_id)
 THEN RAISE EXCEPTION '無權合併此 Scope 地點'; END IF;
 IF p_remove_uids IS NULL OR cardinality(p_remove_uids) NOT BETWEEN 1 AND 100
 OR p_keep_uid=ANY(p_remove_uids)
 OR cardinality(p_remove_uids)<>(SELECT count(DISTINCT id) FROM unnest(p_remove_uids) id)
 THEN RAISE EXCEPTION '地點清單無效或包含重複 UID'; END IF;
 table_name:=p_scope_id||'_trace';place_table:=p_scope_id||'_place';
 EXECUTE format('SELECT count(*) FROM silver.%I WHERE trace_type=''space_anchor''
 AND (uid=$1 OR uid=ANY($2)) %s',
 table_name,CASE WHEN p_scope_id='loc' THEN 'AND scope_id=''loc''' ELSE '' END)
 INTO count_matches USING p_keep_uid,p_remove_uids;
 IF count_matches<>cardinality(p_remove_uids)+1 THEN RAISE EXCEPTION '指定定錨點不存在或跨 Scope'; END IF;
 -- Avoid collapsing a valid two-point road into an invalid single-point road.
 EXECUTE format($sql$SELECT count(*) FROM silver.%I WHERE trace_type='space_road'
 AND anchor_list && $1::text[] AND $2=ANY(anchor_list) %s$sql$,table_name,
 CASE WHEN p_scope_id='loc' THEN 'AND scope_id=''loc''' ELSE '' END)
 INTO count_matches USING p_remove_uids::text[],p_keep_uid;
 IF count_matches>0 THEN RAISE EXCEPTION '路線會重複指向同一點，請先調整路線'; END IF;
 EXECUTE format($sql$SELECT array_agg(DISTINCT name ORDER BY name) FROM (
 SELECT title name FROM silver.%I WHERE uid=$1 OR uid=ANY($2)
 UNION ALL SELECT unnest(name_lists) FROM silver.%I WHERE uid=$1 OR uid=ANY($2)
 ) s WHERE nullif(btrim(name),'') IS NOT NULL$sql$,table_name,place_table)
 INTO all_names USING p_keep_uid,p_remove_uids;
 EXECUTE format($sql$INSERT INTO silver.trace_place_merge_archive(scope_id,old_uid,canonical_uid,original_record)
 SELECT $1,uid,$2,to_jsonb(row) FROM silver.%I row
 WHERE uid=ANY($3) AND trace_type='space_anchor' ON CONFLICT(scope_id,old_uid) DO NOTHING$sql$,table_name)
 USING p_scope_id,p_keep_uid,p_remove_uids;
 -- Spatial references are not article assignments. Do not change Galaxy.place_id.
 FOREACH remove_uid IN ARRAY p_remove_uids LOOP
  EXECUTE format($sql$UPDATE silver.%I SET anchor_list=array_replace(anchor_list,$1,$2)
    WHERE trace_type IN ('space_road','space_trace') AND $1=ANY(anchor_list) %s$sql$,
    table_name,CASE WHEN p_scope_id='loc' THEN 'AND scope_id=''loc''' ELSE '' END)
  USING remove_uid,p_keep_uid::text;
 END LOOP;
 UPDATE silver.trace_place_alias SET anchor_uid=p_keep_uid
 WHERE scope_id=p_scope_id AND anchor_uid=ANY(p_remove_uids);
 EXECUTE format('INSERT INTO silver.%I(uid,name_lists) VALUES($1,$2)
 ON CONFLICT(uid) DO UPDATE SET name_lists=excluded.name_lists,updated_at=now()',place_table)
 USING p_keep_uid,coalesce(all_names,'{}'::text[]);
 EXECUTE format('DELETE FROM silver.%I WHERE uid=ANY($1) AND trace_type=''space_anchor'' %s',
 table_name,CASE WHEN p_scope_id='loc' THEN 'AND scope_id=''loc''' ELSE '' END)
 USING p_remove_uids;
 GET DIAGNOSTICS count_matches=ROW_COUNT;
 IF count_matches<>cardinality(p_remove_uids) THEN RAISE EXCEPTION '合併筆數不一致'; END IF;
 EXECUTE format('DELETE FROM silver.%I WHERE uid=ANY($1)',place_table) USING p_remove_uids;
 RETURN count_matches;
END $fn$;

ALTER TABLE silver.lo3rwang_trace ENABLE TRIGGER USER;

ALTER TABLE silver.lrunes_trace ENABLE TRIGGER USER;

ALTER TABLE silver.loc_trace ENABLE TRIGGER USER;

DO $verify$ BEGIN
 IF (SELECT count(*) FROM silver.lo3rwang_trace)<>582
 OR (SELECT count(*) FROM silver.loc_trace WHERE scope_id='lo3rwang')<>582
 OR (SELECT count(*) FROM silver.lo3rwang_trace WHERE trace_type='space_anchor')<>581
 OR (SELECT count(*) FROM silver.lo3rwang_trace WHERE trace_type='space_road')<>1
 OR (SELECT count(*) FROM silver.trace_uid_migration_backup)<>582
 THEN RAISE EXCEPTION 'Trace column simplification lost historical records'; END IF;
END $verify$;

COMMIT;