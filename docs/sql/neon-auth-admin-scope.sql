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

COMMIT;
