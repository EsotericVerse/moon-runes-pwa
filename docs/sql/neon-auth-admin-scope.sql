-- Current authorization contract: Neon Auth only.
-- Identity: normalized email.
-- Authorization: exactly one role, either "admin" or "scope:<scope_id>".
-- admin may cross scopes; scope roles may only manage their own scope.
-- No user.id authorization, page_manager, scope_manager, access_grant or per-page grants.

BEGIN;

DELETE FROM silver.manage WHERE record_type='permission';

DROP INDEX IF EXISTS silver.loc_scope_grant_uq;
DROP POLICY IF EXISTS manage_runtime_select ON silver.manage;
DROP POLICY IF EXISTS loc_scope_public_select ON silver.manage;

ALTER TABLE silver.manage DROP CONSTRAINT IF EXISTS loc_scope_check4;
ALTER TABLE silver.manage DROP CONSTRAINT IF EXISTS loc_scope_record_type_check;
ALTER TABLE silver.manage DROP CONSTRAINT IF EXISTS manage_privileges_not_null;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='silver.manage'::regclass
      AND conname='manage_record_type_current_check'
  ) THEN
    ALTER TABLE silver.manage
      ADD CONSTRAINT manage_record_type_current_check
      CHECK (record_type = ANY (ARRAY[
        'group','scope','relation','relation_request','work_affiliation',
        'content_audit','anchor','period','event'
      ]::text[]));
  END IF;
END
$$;

DROP VIEW IF EXISTS silver.loc_scope;
ALTER TABLE silver.manage
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS privileges,
  DROP COLUMN IF EXISTS user_id,
  DROP COLUMN IF EXISTS access_level,
  DROP COLUMN IF EXISTS case_id,
  DROP COLUMN IF EXISTS granted_by,
  DROP COLUMN IF EXISTS granted_at;
CREATE VIEW silver.loc_scope AS SELECT * FROM silver.manage;
GRANT SELECT ON silver.loc_scope TO anonymous,authenticated;

CREATE OR REPLACE FUNCTION silver.current_auth_email()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT lower(coalesce(auth.jwt()->>'email',''))
$$;

CREATE OR REPLACE FUNCTION silver.current_auth_role()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'silver','neon_auth','public'
AS $$
DECLARE
  v_email text:=silver.current_auth_email();
  v_role text;
BEGIN
  IF v_email='' THEN RETURN NULL; END IF;
  SELECT u.role INTO v_role
    FROM neon_auth."user" u
   WHERE lower(u.email)=v_email
   LIMIT 1;
  IF v_role ~ '^(admin|scope:[A-Za-z][A-Za-z0-9_.-]{0,62})$' THEN
    RETURN v_role;
  END IF;
  RETURN NULL;
END
$$;

CREATE OR REPLACE FUNCTION silver.can_manage_global()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'silver','public'
AS $$
  SELECT coalesce(silver.current_auth_role()='admin',false)
$$;

CREATE OR REPLACE FUNCTION silver.can_manage_scope(p_scope_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'silver','public'
AS $$
  SELECT coalesce(
    silver.current_auth_role()='admin'
    OR silver.current_auth_role()=
      'scope:'||
      CASE
        WHEN trim(coalesce(p_scope_id,'')) IN ('lunarunes','runes') THEN 'lrunes'
        ELSE trim(coalesce(p_scope_id,''))
      END,
    false
  )
$$;

GRANT EXECUTE ON FUNCTION silver.current_auth_email() TO authenticated;
GRANT EXECUTE ON FUNCTION silver.current_auth_role() TO authenticated;
GRANT EXECUTE ON FUNCTION silver.can_manage_global() TO authenticated;
GRANT EXECUTE ON FUNCTION silver.can_manage_scope(text) TO authenticated;

DROP POLICY IF EXISTS lrunes_owner_insert ON silver.lrunes;
DROP POLICY IF EXISTS lrunes_owner_update ON silver.lrunes;
DROP POLICY IF EXISTS lrunes_owner_delete ON silver.lrunes;
DROP POLICY IF EXISTS lrunes_scope_insert ON silver.lrunes;
DROP POLICY IF EXISTS lrunes_scope_update ON silver.lrunes;
DROP POLICY IF EXISTS lrunes_scope_delete ON silver.lrunes;
CREATE POLICY lrunes_scope_insert ON silver.lrunes FOR INSERT TO authenticated
WITH CHECK (silver.can_manage_scope('lrunes'));
CREATE POLICY lrunes_scope_update ON silver.lrunes FOR UPDATE TO authenticated
USING (silver.can_manage_scope('lrunes'))
WITH CHECK (silver.can_manage_scope('lrunes'));
CREATE POLICY lrunes_scope_delete ON silver.lrunes FOR DELETE TO authenticated
USING (silver.can_manage_scope('lrunes'));

DROP POLICY IF EXISTS manage_public_select ON silver.manage;
DROP POLICY IF EXISTS manage_audit_select ON silver.manage;
DROP POLICY IF EXISTS manage_scope_insert ON silver.manage;
DROP POLICY IF EXISTS manage_scope_update ON silver.manage;
DROP POLICY IF EXISTS manage_scope_delete ON silver.manage;
CREATE POLICY manage_public_select ON silver.manage FOR SELECT TO anonymous,authenticated
USING (
  ((record_type IN ('group','scope')) AND active)
  OR record_type IN ('relation','work_affiliation','anchor','period','event')
);
CREATE POLICY manage_audit_select ON silver.manage FOR SELECT TO authenticated
USING (
  record_type='content_audit'
  AND silver.can_manage_scope(coalesce(target_scope_id,scope_id))
);
CREATE POLICY manage_scope_insert ON silver.manage FOR INSERT TO authenticated
WITH CHECK (
  (record_type IN ('group','scope') AND silver.can_manage_global())
  OR (record_type IN ('anchor','period','event') AND silver.can_manage_scope(scope_id))
);
CREATE POLICY manage_scope_update ON silver.manage FOR UPDATE TO authenticated
USING (
  (record_type IN ('group','scope') AND silver.can_manage_global())
  OR (record_type IN ('anchor','period','event') AND silver.can_manage_scope(scope_id))
)
WITH CHECK (
  (record_type IN ('group','scope') AND silver.can_manage_global())
  OR (record_type IN ('anchor','period','event') AND silver.can_manage_scope(scope_id))
);
CREATE POLICY manage_scope_delete ON silver.manage FOR DELETE TO authenticated
USING (
  (record_type IN ('group','scope') AND silver.can_manage_global())
  OR (record_type IN ('anchor','period','event') AND silver.can_manage_scope(scope_id))
);


CREATE OR REPLACE FUNCTION silver.log_scope_content_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'silver','neon_auth','public'
AS $
DECLARE
  old_row jsonb:=coalesce(to_jsonb(OLD),'{}'::jsonb);
  new_row jsonb:=coalesce(to_jsonb(NEW),'{}'::jsonb);
  item record;
  v_target_scope text;
  v_log_scope text;
  v_type text;
  v_id text;
  v_actor text;
  v_actor_name text;
  v_actor_email text;
BEGIN
  v_actor_email:=silver.current_auth_email();
  v_actor:=v_actor_email;

  SELECT u.name INTO v_actor_name
    FROM neon_auth."user" u
   WHERE lower(u.email)=v_actor_email
   LIMIT 1;

  IF TG_TABLE_NAME='resource_visibility' THEN
    v_target_scope:=coalesce(old_row->>'scope',new_row->>'scope');
    v_type:=coalesce(old_row->>'resource_type',new_row->>'resource_type');
    v_id:=coalesce(old_row->>'resource_id',new_row->>'resource_id');
  ELSE
    v_target_scope:=coalesce(old_row->>'scope_id',new_row->>'scope_id');
    v_type:=CASE TG_TABLE_NAME
      WHEN 'lo3rwang_galaxy' THEN 'galaxy'
      WHEN 'lo3rwang_galaxy_media' THEN 'galaxy_media'
      ELSE TG_TABLE_NAME
    END;
    v_id:=CASE TG_TABLE_NAME
      WHEN 'lo3rwang_galaxy' THEN coalesce(old_row->>'galaxy_id',new_row->>'galaxy_id')
      WHEN 'lo3rwang_galaxy_media' THEN coalesce(old_row->>'media_id',new_row->>'media_id')
      ELSE NULL
    END;
  END IF;

  v_log_scope:=CASE WHEN silver.can_manage_global() THEN 'admin' ELSE v_target_scope END;

  FOR item IN SELECT key,value FROM jsonb_each(old_row)
  LOOP
    IF item.value IS DISTINCT FROM new_row->item.key THEN
      INSERT INTO silver.manage(
        record_type,scope_id,target_scope_id,resource_type,resource_id,
        actor_id,actor_name,actor_email,field_name,old_value,new_value
      ) VALUES (
        'content_audit',v_log_scope,v_target_scope,v_type,v_id,
        v_actor,v_actor_name,v_actor_email,item.key,
        item.value #>> '{}',new_row->item.key #>> '{}'
      );
    END IF;
  END LOOP;

  IF TG_OP='INSERT' THEN
    FOR item IN SELECT key,value FROM jsonb_each(new_row)
    LOOP
      INSERT INTO silver.manage(
        record_type,scope_id,target_scope_id,resource_type,resource_id,
        actor_id,actor_name,actor_email,field_name,old_value,new_value
      ) VALUES (
        'content_audit',v_log_scope,v_target_scope,v_type,v_id,
        v_actor,v_actor_name,v_actor_email,item.key,NULL,item.value #>> '{}'
      );
    END LOOP;
  END IF;

  RETURN NEW;
END
$;

DROP POLICY IF EXISTS lo3rwang_galaxy_public_read ON silver.lo3rwang_galaxy;
DROP POLICY IF EXISTS lo3rwang_galaxy_scope_update ON silver.lo3rwang_galaxy;
CREATE POLICY lo3rwang_galaxy_public_read ON silver.lo3rwang_galaxy FOR SELECT TO anonymous,authenticated USING (true);
CREATE POLICY lo3rwang_galaxy_scope_update ON silver.lo3rwang_galaxy FOR UPDATE TO authenticated
USING (silver.can_manage_scope(scope_id))
WITH CHECK (silver.can_manage_scope(scope_id));

DROP POLICY IF EXISTS lo3rwang_galaxy_media_public_read ON silver.lo3rwang_galaxy_media;
DROP POLICY IF EXISTS lo3rwang_galaxy_media_scope_update ON silver.lo3rwang_galaxy_media;
CREATE POLICY lo3rwang_galaxy_media_public_read ON silver.lo3rwang_galaxy_media FOR SELECT TO anonymous,authenticated USING (true);
CREATE POLICY lo3rwang_galaxy_media_scope_update ON silver.lo3rwang_galaxy_media FOR UPDATE TO authenticated
USING (silver.can_manage_scope(scope_id))
WITH CHECK (silver.can_manage_scope(scope_id));

DROP POLICY IF EXISTS lo3rwang_style_scope_insert ON silver.lo3rwang_style;
DROP POLICY IF EXISTS lo3rwang_style_scope_update ON silver.lo3rwang_style;
DROP POLICY IF EXISTS lo3rwang_style_scope_delete ON silver.lo3rwang_style;
CREATE POLICY lo3rwang_style_scope_insert ON silver.lo3rwang_style FOR INSERT TO authenticated
WITH CHECK (silver.can_manage_scope('lo3rwang'));
CREATE POLICY lo3rwang_style_scope_update ON silver.lo3rwang_style FOR UPDATE TO authenticated
USING (silver.can_manage_scope('lo3rwang'))
WITH CHECK (silver.can_manage_scope('lo3rwang'));
CREATE POLICY lo3rwang_style_scope_delete ON silver.lo3rwang_style FOR DELETE TO authenticated
USING (silver.can_manage_scope('lo3rwang'));

ALTER TABLE silver.lo3rwang_style_keywords ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON silver.lo3rwang_style_keywords TO anonymous,authenticated;
GRANT INSERT,UPDATE,DELETE ON silver.lo3rwang_style_keywords TO authenticated;
DROP POLICY IF EXISTS lo3rwang_style_keywords_public_read ON silver.lo3rwang_style_keywords;
DROP POLICY IF EXISTS lo3rwang_style_keywords_scope_insert ON silver.lo3rwang_style_keywords;
DROP POLICY IF EXISTS lo3rwang_style_keywords_scope_update ON silver.lo3rwang_style_keywords;
DROP POLICY IF EXISTS lo3rwang_style_keywords_scope_delete ON silver.lo3rwang_style_keywords;
CREATE POLICY lo3rwang_style_keywords_public_read ON silver.lo3rwang_style_keywords FOR SELECT TO anonymous,authenticated USING (true);
CREATE POLICY lo3rwang_style_keywords_scope_insert ON silver.lo3rwang_style_keywords FOR INSERT TO authenticated
WITH CHECK (silver.can_manage_scope('lo3rwang'));
CREATE POLICY lo3rwang_style_keywords_scope_update ON silver.lo3rwang_style_keywords FOR UPDATE TO authenticated
USING (silver.can_manage_scope('lo3rwang'))
WITH CHECK (silver.can_manage_scope('lo3rwang'));
CREATE POLICY lo3rwang_style_keywords_scope_delete ON silver.lo3rwang_style_keywords FOR DELETE TO authenticated
USING (silver.can_manage_scope('lo3rwang'));

DROP POLICY IF EXISTS resource_visibility_scope_insert ON silver.resource_visibility;
DROP POLICY IF EXISTS resource_visibility_scope_update ON silver.resource_visibility;
CREATE POLICY resource_visibility_scope_insert ON silver.resource_visibility FOR INSERT TO authenticated
WITH CHECK (silver.can_manage_scope(scope));
CREATE POLICY resource_visibility_scope_update ON silver.resource_visibility FOR UPDATE TO authenticated
USING (silver.can_manage_scope(scope))
WITH CHECK (silver.can_manage_scope(scope));

COMMIT;
