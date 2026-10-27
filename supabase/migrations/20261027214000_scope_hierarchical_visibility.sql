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
