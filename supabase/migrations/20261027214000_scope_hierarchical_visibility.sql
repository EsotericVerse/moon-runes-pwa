-- Source-scope hierarchical privacy, three-depth rule (-1 public, 0 self,
-- 1 direct descendants, 2 all descendants). Reference-aware RLS checks mean
-- shared anchors retain privacy regardless of which parent route is opened.
DO $columns$
DECLARE s text;
BEGIN
  FOREACH s IN ARRAY ARRAY['lo3rwang','lrunes','loc'] LOOP
    EXECUTE format('ALTER TABLE silver.%I ADD COLUMN IF NOT EXISTS hidden_depth smallint NOT NULL DEFAULT -1',s||'_trace');
    EXECUTE format('ALTER TABLE silver.%I ADD COLUMN IF NOT EXISTS route_list text[] NOT NULL DEFAULT ''{}''::text[]',s||'_trace');
    EXECUTE format('ALTER TABLE silver.%I DROP CONSTRAINT IF EXISTS %I',s||'_trace',s||'_trace_hidden_depth_check');
    EXECUTE format('ALTER TABLE silver.%I ADD CONSTRAINT %I CHECK (hidden_depth BETWEEN -1 AND 2)',s||'_trace',s||'_trace_hidden_depth_check');
  END LOOP;
  FOREACH s IN ARRAY ARRAY['lo3rwang','lrunes'] LOOP
    EXECUTE format('ALTER TABLE silver.%I ADD COLUMN IF NOT EXISTS hidden_depth smallint NOT NULL DEFAULT -1',s||'_time');
    EXECUTE format('ALTER TABLE silver.%I DROP CONSTRAINT IF EXISTS %I',s||'_time',s||'_time_hidden_depth_check');
    EXECUTE format('ALTER TABLE silver.%I ADD CONSTRAINT %I CHECK (hidden_depth BETWEEN -1 AND 2)',s||'_time',s||'_time_hidden_depth_check');
  END LOOP;
END $columns$;

CREATE OR REPLACE FUNCTION silver.is_time_record_public(p_scope text,p_uid text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','silver' AS $fn$
DECLARE rel regclass; record_type text; depth smallint; blocked boolean := false;
BEGIN
  IF p_scope NOT IN ('lo3rwang','lrunes') OR p_uid IS NULL THEN RETURN false; END IF;
  rel:=to_regclass(format('silver.%I',p_scope||'_time'));
  EXECUTE format('SELECT type,hidden_depth FROM %s WHERE uid::text=$1',rel)
    INTO record_type,depth USING p_uid;
  IF record_type IS NULL OR depth IS NULL OR depth>=0 THEN RETURN false; END IF;
  IF record_type='time_period' THEN
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM %s t WHERE t.type=''time_trace'' AND t.hidden_depth>=1 AND $1=ANY(t.anchor_ids))',rel)
      INTO blocked USING p_uid;
  ELSIF record_type='anchor' THEN
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM %s e WHERE e.type=''time_period'' AND e.hidden_depth>=1 AND $1=ANY(e.anchor_ids)) OR EXISTS(SELECT 1 FROM %s t JOIN %s e ON e.type=''time_period'' AND e.uid=ANY(t.anchor_ids) WHERE t.type=''time_trace'' AND t.hidden_depth>=2 AND $1=ANY(e.anchor_ids))',rel,rel,rel)
      INTO blocked USING p_uid;
  END IF;
  RETURN NOT COALESCE(blocked,false);
END $fn$;

CREATE OR REPLACE FUNCTION silver.is_spatial_record_public(p_scope text,p_uid text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','silver' AS $fn$
DECLARE rel regclass; record_type text; depth smallint; blocked boolean := false;
BEGIN
  IF p_scope NOT IN ('lo3rwang','lrunes','loc') OR p_uid IS NULL THEN RETURN false; END IF;
  rel:=to_regclass(format('silver.%I',p_scope||'_trace'));
  EXECUTE format('SELECT trace_type,hidden_depth FROM %s WHERE uid::text=$1',rel)
    INTO record_type,depth USING p_uid;
  IF record_type IS NULL OR depth IS NULL OR depth>=0 THEN RETURN false; END IF;
  IF record_type='space_period' THEN
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM %s t WHERE t.trace_type=''space_trace'' AND t.hidden_depth>=1 AND $1=ANY(t.route_list))',rel)
      INTO blocked USING p_uid;
  ELSIF record_type='space_anchor' THEN
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM %s r WHERE r.trace_type=''space_period'' AND r.hidden_depth>=1 AND $1=ANY(r.anchor_list)) OR EXISTS(SELECT 1 FROM %s t WHERE t.trace_type=''space_trace'' AND t.hidden_depth>=2 AND ($1=ANY(t.anchor_list) OR EXISTS(SELECT 1 FROM %s r WHERE r.trace_type=''space_period'' AND r.uid=ANY(t.route_list) AND $1=ANY(r.anchor_list))))',rel,rel,rel)
      INTO blocked USING p_uid;
  END IF;
  RETURN NOT COALESCE(blocked,false);
END $fn$;


-- RLS expressions must call only functions the anon role may execute.
-- This SECURITY DEFINER bridge reads JWT-derived identity without granting
-- direct access to silver.can_manage_scope or exposing hidden records.
CREATE OR REPLACE FUNCTION silver.can_read_hidden_scope_records(p_scope text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','silver' AS $fn$
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  RETURN silver.can_manage_scope(p_scope);
END $fn$;
REVOKE ALL ON FUNCTION silver.can_read_hidden_scope_records(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION silver.can_read_hidden_scope_records(text) TO anon,authenticated;

DO $policy$
DECLARE s text;
BEGIN
  FOREACH s IN ARRAY ARRAY['lo3rwang','lrunes','loc'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON silver.%I',s||'_trace_public_read',s||'_trace');
    EXECUTE format('CREATE POLICY %I ON silver.%I FOR SELECT TO public USING (silver.can_read_hidden_scope_records(%L) OR silver.is_spatial_record_public(%L,uid::text))',s||'_trace_public_read',s||'_trace',s,s);
  END LOOP;
  FOREACH s IN ARRAY ARRAY['lo3rwang','lrunes'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON silver.%I',s||'_time_v2_public_read',s||'_time');
    EXECUTE format('CREATE POLICY %I ON silver.%I FOR SELECT TO public USING (silver.can_read_hidden_scope_records(%L) OR silver.is_time_record_public(%L,uid::text))',s||'_time_v2_public_read',s||'_time',s,s);
  END LOOP;
END $policy$;
REVOKE ALL ON FUNCTION silver.is_time_record_public(text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION silver.is_spatial_record_public(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION silver.is_time_record_public(text,text) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION silver.is_spatial_record_public(text,text) TO anon,authenticated;


-- New spatial grouping accepts either original endpoint pairs, explicitly
-- referenced existing routes, or both. Replaces the old trigger implementation
-- without detaching its existing triggers or weakening Scope constraints.
CREATE OR REPLACE FUNCTION silver.validate_scoped_trace_map()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog','silver'
AS $validate$
DECLARE
  member_ids text[];
  route_ids text[];
  available integer;
  query text;
  point_count integer:=coalesce(cardinality(NEW.anchor_list),0);
  route_count integer:=coalesce(cardinality(NEW.route_list),0);
BEGIN
  IF NEW.trace_type='space_anchor' THEN
    IF route_count<>0 THEN RAISE EXCEPTION '定錨點不可包含路線圖'; END IF;
    RETURN NEW;
  END IF;
  IF NEW.trace_type='space_period' THEN
    IF route_count<>0 THEN RAISE EXCEPTION '路線圖不可包含其他路線圖'; END IF;
    IF coalesce(array_ndims(NEW.anchor_list),0)<>1
       OR point_count NOT BETWEEN 2 AND 80 THEN
      RAISE EXCEPTION '路線圖必須包含 2 至 80 個有序地點';
    END IF;
    IF (SELECT count(DISTINCT id) FROM unnest(NEW.anchor_list) AS u(id))<>point_count THEN
      RAISE EXCEPTION '同一路線不可以重複加入地點';
    END IF;
  ELSIF NEW.trace_type='space_trace' THEN
    IF route_count>80 THEN RAISE EXCEPTION '痕跡圖最多包含 80 條路線'; END IF;
    IF point_count=0 AND route_count=0 THEN
      RAISE EXCEPTION '痕跡圖至少需要一條路線或一組端點';
    END IF;
    IF point_count>0 THEN
      IF coalesce(array_ndims(NEW.anchor_list),0)<>2
        OR coalesce(array_length(NEW.anchor_list,2),0)<>2
        OR coalesce(array_length(NEW.anchor_list,1),0)>400 THEN
        RAISE EXCEPTION '痕跡圖端點必須為兩兩配對';
      END IF;
      IF EXISTS(SELECT 1 FROM generate_subscripts(NEW.anchor_list,1) AS g(i)
        WHERE NEW.anchor_list[g.i][1] IS NULL
        OR NEW.anchor_list[g.i][2] IS NULL
        OR NEW.anchor_list[g.i][1]=NEW.anchor_list[g.i][2]) THEN
        RAISE EXCEPTION '起點終點不可相同或為空';
      END IF;
    END IF;
  ELSE
    RAISE EXCEPTION '不支援的空間紀錄類型';
  END IF;
  IF EXISTS(SELECT 1 FROM unnest(NEW.anchor_list) AS a(id)
    WHERE id IS NULL OR id !~ '^[A-Za-z0-9]{4}$') THEN
    RAISE EXCEPTION '定錨點 UID 格式錯誤';
  END IF;
  IF EXISTS(SELECT 1 FROM unnest(coalesce(NEW.route_list,'{}'::text[])) AS r(id)
    WHERE id IS NULL OR id !~ '^[A-Za-z0-9]{4}$') THEN
    RAISE EXCEPTION '路線圖 UID 格式錯誤';
  END IF;
  IF route_count>0 THEN
    IF (SELECT count(DISTINCT id) FROM unnest(NEW.route_list) AS r(id))<>route_count THEN
      RAISE EXCEPTION '所屬路線圖 UID 不能重複';
    END IF;
    query:=format('SELECT count(*) FROM %I.%I
      WHERE trace_type=''space_period'' AND uid=ANY($1)',TG_TABLE_SCHEMA,TG_TABLE_NAME);
    EXECUTE query INTO available USING NEW.route_list;
    IF available<>route_count THEN
      RAISE EXCEPTION '空間痕跡圖不能引用不存在或跨 Scope 的路線圖';
    END IF;
  END IF;
  IF point_count>0 THEN
    SELECT array_agg(DISTINCT id) INTO member_ids FROM unnest(NEW.anchor_list) AS a(id);
    query:=format('SELECT count(*) FROM %I.%I
      WHERE trace_type=''space_anchor'' AND uid=ANY($1)',TG_TABLE_SCHEMA,TG_TABLE_NAME);
    EXECUTE query INTO available USING member_ids;
    IF available<>coalesce(cardinality(member_ids),0) THEN
      RAISE EXCEPTION '不能引用不存在或跨 Scope 的空間定錨點';
    END IF;
  END IF;
  RETURN NEW;
END
$validate$;
