-- LOC Admin governance: global Email blocklist, independent Rune66 copy and guarded Scope deletion.
-- No data is deleted by this migration; delete_scope only executes after explicit Admin RPC.
CREATE TABLE IF NOT EXISTS silver.email_blocklist (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_blocklist_normalized CHECK (email = lower(btrim(email))),
  CONSTRAINT email_blocklist_format CHECK (email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
);
ALTER TABLE silver.email_blocklist ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON silver.email_blocklist FROM PUBLIC, anonymous;
GRANT SELECT, INSERT, DELETE ON silver.email_blocklist TO authenticated;

CREATE OR REPLACE FUNCTION silver.is_current_email_blocklisted()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','silver','api'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM silver.email_blocklist
    WHERE email = silver.current_auth_email()
  )
$$;
REVOKE ALL ON FUNCTION silver.is_current_email_blocklisted() FROM PUBLIC,anonymous;
GRANT EXECUTE ON FUNCTION silver.is_current_email_blocklisted() TO authenticated;

-- Both application and database write authorization must reject a blocklisted account.
CREATE OR REPLACE FUNCTION silver.can_manage_global()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','silver','api'
AS $$
  SELECT NOT silver.is_current_email_blocklisted() AND EXISTS (
    SELECT 1 FROM silver.manage
    WHERE lower(email)=silver.current_auth_email() AND role='admin'
  )
$$;
CREATE OR REPLACE FUNCTION silver.can_manage_scope(p_scope_id text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','silver','api'
AS $$
  SELECT NOT silver.is_current_email_blocklisted() AND EXISTS (
    SELECT 1 FROM silver.manage
    WHERE lower(email)=silver.current_auth_email()
    AND (role='admin' OR (role='scope' AND id=p_scope_id))
  )
$$;

DROP POLICY IF EXISTS email_blocklist_admin_read ON silver.email_blocklist;
CREATE POLICY email_blocklist_admin_read ON silver.email_blocklist
FOR SELECT TO authenticated USING (silver.can_manage_global());
DROP POLICY IF EXISTS email_blocklist_admin_add ON silver.email_blocklist;
CREATE POLICY email_blocklist_admin_add ON silver.email_blocklist
FOR INSERT TO authenticated
WITH CHECK (silver.can_manage_global() AND email<>silver.current_auth_email());
DROP POLICY IF EXISTS email_blocklist_admin_remove ON silver.email_blocklist;
CREATE POLICY email_blocklist_admin_remove ON silver.email_blocklist
FOR DELETE TO authenticated USING (silver.can_manage_global());

CREATE OR REPLACE FUNCTION api.copy_rune66_keyword_class(p_scope_id text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE
  v_scope text := lower(btrim(coalesce(p_scope_id,'')));
  v_source_class uuid;
  v_copy_id uuid := gen_random_uuid();
  v_class_name text;
  v_target regclass;
  v_count integer;
BEGIN
  IF v_scope !~ '^[a-z][a-z0-9]{0,14}$' THEN RAISE EXCEPTION 'invalid Scope ID'; END IF;
  IF NOT silver.can_manage_scope(v_scope) THEN RAISE EXCEPTION 'Scope management permission denied'; END IF;
  IF NOT EXISTS(SELECT 1 FROM silver.scope_registry WHERE scope_id=v_scope AND scope_kind='scope')
    THEN RAISE EXCEPTION 'Scope does not exist'; END IF;
  v_target := to_regclass(format('silver.%I',v_scope||'_keywords'));
  IF v_target IS NULL THEN RAISE EXCEPTION 'Scope keyword table does not exist'; END IF;
  SELECT current_keyword_class_id INTO v_source_class FROM silver.lo3rwang WHERE id='lo3rwang';
  IF v_source_class IS NULL THEN RAISE EXCEPTION 'Source Rune66 Class is not configured'; END IF;
  SELECT count(*) INTO v_count FROM silver.lo3rwang_keywords WHERE class_id=v_source_class;
  IF v_count<>66 THEN RAISE EXCEPTION 'Rune66 copy requires exactly 66 source entries; got %',v_count; END IF;

  v_class_name := '符文66副本-'||replace(v_copy_id::text,'-','');
  INSERT INTO silver.keyword_classes(class_id,scope_id) VALUES(v_copy_id,v_scope);
  EXECUTE format(
    'INSERT INTO %s(class_id,group_name,item_no,item_name,principle,keywords,order_no,class_name,class_group,class_enable)
     SELECT $1,$2,item_no,item_name,principle,keywords,order_no,$2,class_group,class_enable
     FROM silver.lo3rwang_keywords WHERE class_id=$3 ORDER BY order_no,item_no',
    v_target
  ) USING v_copy_id,v_class_name,v_source_class;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count<>66 THEN RAISE EXCEPTION 'Rune66 copy wrote % instead of 66 entries',v_count; END IF;
  RETURN jsonb_build_object('class_id',v_copy_id,'class_name',v_class_name,'count',v_count);
END;
$$;
REVOKE ALL ON FUNCTION api.copy_rune66_keyword_class(text) FROM PUBLIC,anonymous;
GRANT EXECUTE ON FUNCTION api.copy_rune66_keyword_class(text) TO authenticated;
CREATE OR REPLACE FUNCTION silver.copy_rune66_keyword_class(p_scope_id text)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path TO ''
AS $$ SELECT api.copy_rune66_keyword_class(p_scope_id) $$;
REVOKE ALL ON FUNCTION silver.copy_rune66_keyword_class(text) FROM PUBLIC,anonymous;
GRANT EXECUTE ON FUNCTION silver.copy_rune66_keyword_class(text) TO authenticated;

-- Physical deletion requires global Admin; protected named Scopes cannot be deleted.
-- Dependencies are RESTRICT-ed so unexpected references cause a full rollback.
CREATE OR REPLACE FUNCTION api.delete_scope(p_scope_id text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE
  v_scope text := lower(btrim(coalesce(p_scope_id,'')));
  v_kind text;
  v_suffix text;
  v_relation text;
BEGIN
  IF NOT silver.can_manage_global() THEN RAISE EXCEPTION 'Global Admin permission required'; END IF;
  IF v_scope !~ '^[a-z][a-z0-9]{0,14}$' THEN RAISE EXCEPTION 'invalid Scope ID'; END IF;
  IF v_scope IN ('loc','lrunes','lo3rwang','admin') THEN RAISE EXCEPTION 'Cannot delete a built-in Scope'; END IF;
  SELECT scope_kind INTO v_kind FROM silver.scope_registry WHERE scope_id=v_scope FOR UPDATE;
  IF NOT FOUND OR v_kind<>'scope' THEN RAISE EXCEPTION 'Only an existing non-system Scope may be deleted'; END IF;
  IF EXISTS(SELECT 1 FROM silver.scope_registry WHERE parent_scope_id=v_scope)
    THEN RAISE EXCEPTION 'Scope has child Registry entries'; END IF;
  FOREACH v_suffix IN ARRAY ARRAY['_galaxy_media','_galaxy','_time','_keywords','_blocks',''] LOOP
    v_relation := format('silver.%I',v_scope||v_suffix);
    IF to_regclass(v_relation) IS NULL THEN RAISE EXCEPTION 'Expected Scope table % is missing',v_relation; END IF;
    EXECUTE 'DROP TABLE '||v_relation||' RESTRICT';
  END LOOP;
  DELETE FROM silver.keyword_classes WHERE scope_id=v_scope;
  DELETE FROM silver.manage WHERE id=v_scope;
  DELETE FROM silver.scope_registry WHERE scope_id=v_scope;
  RETURN jsonb_build_object('scope_id',v_scope,'deleted',true);
END;
$$;
REVOKE ALL ON FUNCTION api.delete_scope(text) FROM PUBLIC,anonymous;
GRANT EXECUTE ON FUNCTION api.delete_scope(text) TO authenticated;
CREATE OR REPLACE FUNCTION silver.delete_scope(p_scope_id text)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path TO ''
AS $$ SELECT api.delete_scope(p_scope_id) $$;
REVOKE ALL ON FUNCTION silver.delete_scope(text) FROM PUBLIC,anonymous;
GRANT EXECUTE ON FUNCTION silver.delete_scope(text) TO authenticated;

-- Retain the existing provision_scope function signature and body while allowing the
-- already-supported system-default client selection; fail if source contract diverges.
DO $patch_theme$
DECLARE
  v_before text;
  v_after text;
BEGIN
  SELECT pg_get_functiondef('api.provision_scope(text,text,text,date,text,text,text,text,boolean)'::regprocedure)
    INTO v_before;
  v_after := replace(v_before,
    'if v_theme !~ ''^theme-[1-8]$'' then',
    'if v_theme<>''system-default'' and v_theme !~ ''^theme-[1-8]$'' then');
  IF v_after=v_before THEN RAISE EXCEPTION 'Unexpected provision_scope Theme contract'; END IF;
  EXECUTE v_after;
END;
$patch_theme$;
