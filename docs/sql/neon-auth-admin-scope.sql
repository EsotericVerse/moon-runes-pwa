-- Current LOC authorization + management cleanup.
-- Identity: Neon Auth email.
-- Authorization: exactly one role: admin OR scope:<scope_id>.
-- No user.id authorization, page grants, permission rows, compatibility views, JSON or JSONB.

BEGIN;

DROP VIEW IF EXISTS silver.loc_scope;
DROP VIEW IF EXISTS silver.loc_scope_registry;
DROP VIEW IF EXISTS silver.scope_content_audit;

DELETE FROM silver.manage WHERE record_type='permission';

DROP INDEX IF EXISTS silver.loc_scope_grant_uq;
DROP INDEX IF EXISTS silver.loc_scope_relation_uq;
DROP INDEX IF EXISTS silver.loc_scope_requests_idx;
DROP INDEX IF EXISTS silver.loc_scope_legacy_id_uq;

ALTER TABLE silver.manage DROP CONSTRAINT IF EXISTS loc_scope_check2;
ALTER TABLE silver.manage DROP CONSTRAINT IF EXISTS loc_scope_check3;
ALTER TABLE silver.manage DROP CONSTRAINT IF EXISTS loc_scope_check4;
ALTER TABLE silver.manage DROP CONSTRAINT IF EXISTS loc_scope_check5;
ALTER TABLE silver.manage DROP CONSTRAINT IF EXISTS loc_scope_check6;
ALTER TABLE silver.manage DROP CONSTRAINT IF EXISTS loc_scope_check7;
ALTER TABLE silver.manage DROP CONSTRAINT IF EXISTS loc_scope_record_type_check;
ALTER TABLE silver.manage DROP CONSTRAINT IF EXISTS manage_record_type_current_check;
ALTER TABLE silver.manage DROP CONSTRAINT IF EXISTS manage_privileges_not_null;

ALTER TABLE silver.manage
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS privileges,
  DROP COLUMN IF EXISTS user_id,
  DROP COLUMN IF EXISTS access_level,
  DROP COLUMN IF EXISTS case_id,
  DROP COLUMN IF EXISTS granted_by,
  DROP COLUMN IF EXISTS granted_at,
  DROP COLUMN IF EXISTS legacy_scope_id,
  DROP COLUMN IF EXISTS scope_name,
  DROP COLUMN IF EXISTS scope_kind,
  DROP COLUMN IF EXISTS scope_type,
  DROP COLUMN IF EXISTS domain,
  DROP COLUMN IF EXISTS alias_name,
  DROP COLUMN IF EXISTS parent_scope_id,
  DROP COLUMN IF EXISTS mount_host,
  DROP COLUMN IF EXISTS mount_path,
  DROP COLUMN IF EXISTS local_routes,
  DROP COLUMN IF EXISTS route_patterns,
  DROP COLUMN IF EXISTS compatibility_routes,
  DROP COLUMN IF EXISTS primary_link_label,
  DROP COLUMN IF EXISTS primary_link_href,
  DROP COLUMN IF EXISTS role_link_label,
  DROP COLUMN IF EXISTS role_link_href,
  DROP COLUMN IF EXISTS home_link_labels,
  DROP COLUMN IF EXISTS home_link_hrefs,
  DROP COLUMN IF EXISTS search_collection,
  DROP COLUMN IF EXISTS ranking_title,
  DROP COLUMN IF EXISTS context_table_name,
  DROP COLUMN IF EXISTS extra_privileges,
  DROP COLUMN IF EXISTS graph_enabled,
  DROP COLUMN IF EXISTS include_in_admin_graph,
  DROP COLUMN IF EXISTS include_in_global_search,
  DROP COLUMN IF EXISTS include_in_global_stats,
  DROP COLUMN IF EXISTS display_text,
  DROP COLUMN IF EXISTS relation_id,
  DROP COLUMN IF EXISTS child_scope_id,
  DROP COLUMN IF EXISTS relation_type,
  DROP COLUMN IF EXISTS created_by,
  DROP COLUMN IF EXISTS requested_by,
  DROP COLUMN IF EXISTS reviewed_by,
  DROP COLUMN IF EXISTS reason,
  DROP COLUMN IF EXISTS review_note,
  DROP COLUMN IF EXISTS reviewed_at,
  DROP COLUMN IF EXISTS affiliation_source,
  DROP COLUMN IF EXISTS rule_key,
  DROP COLUMN IF EXISTS display_label,
  DROP COLUMN IF EXISTS search_included,
  DROP COLUMN IF EXISTS statistics_included,
  DROP COLUMN IF EXISTS manual_override,
  DROP COLUMN IF EXISTS override_action,
  DROP COLUMN IF EXISTS actor_id;

ALTER TABLE silver.manage
  ADD CONSTRAINT manage_record_type_current_check
  CHECK (record_type = ANY (ARRAY[
    'group','scope','content_audit','anchor','period','event'
  ]::text[]));

ALTER TABLE silver.manage DROP CONSTRAINT IF EXISTS manage_active_not_null;
ALTER TABLE silver.manage DROP CONSTRAINT IF EXISTS manage_default_theme_id_not_null;
ALTER TABLE silver.manage DROP CONSTRAINT IF EXISTS manage_scope_active_check;
ALTER TABLE silver.manage DROP CONSTRAINT IF EXISTS manage_scope_theme_check;
ALTER TABLE silver.manage ALTER COLUMN active DROP NOT NULL;
ALTER TABLE silver.manage ALTER COLUMN active DROP DEFAULT;
ALTER TABLE silver.manage ALTER COLUMN default_theme_id DROP NOT NULL;
ALTER TABLE silver.manage ALTER COLUMN default_theme_id DROP DEFAULT;
UPDATE silver.manage
SET active=NULL,default_theme_id=NULL
WHERE record_type NOT IN ('group','scope');
ALTER TABLE silver.manage
  ADD CONSTRAINT manage_scope_active_check
  CHECK (record_type NOT IN ('group','scope') OR active IS NOT NULL);
ALTER TABLE silver.manage
  ADD CONSTRAINT manage_scope_theme_check
  CHECK (record_type NOT IN ('group','scope') OR default_theme_id ~ '^theme-[1-8]
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
    OR silver.current_auth_role()='scope:'||
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

CREATE OR REPLACE FUNCTION silver.write_content_audit(
  p_scope_id text,
  p_resource_type text,
  p_resource_id text,
  p_field_name text,
  p_old_value text,
  p_new_value text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'silver','neon_auth','public'
AS $$
DECLARE
  v_actor_email text:=silver.current_auth_email();
  v_actor_name text;
  v_log_scope text;
BEGIN
  SELECT u.name INTO v_actor_name
    FROM neon_auth."user" u
   WHERE lower(u.email)=v_actor_email
   LIMIT 1;

  v_log_scope:=CASE WHEN silver.can_manage_global() THEN 'admin' ELSE p_scope_id END;

  INSERT INTO silver.manage(
    record_type,scope_id,target_scope_id,resource_type,resource_id,
    actor_name,actor_email,field_name,old_value,new_value
  ) VALUES (
    'content_audit',v_log_scope,p_scope_id,p_resource_type,p_resource_id,
    v_actor_name,v_actor_email,p_field_name,p_old_value,p_new_value
  );
END
$$;

CREATE OR REPLACE FUNCTION silver.log_scope_content_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'silver','public'
AS $$
BEGIN
  IF TG_TABLE_NAME='lo3rwang_galaxy' THEN
    IF OLD.title IS DISTINCT FROM NEW.title THEN
      PERFORM silver.write_content_audit(NEW.scope_id,'galaxy',NEW.galaxy_id,'title',OLD.title,NEW.title);
    END IF;
    IF OLD.content IS DISTINCT FROM NEW.content THEN
      PERFORM silver.write_content_audit(NEW.scope_id,'galaxy',NEW.galaxy_id,'content',OLD.content,NEW.content);
    END IF;
    IF OLD.meta_tags IS DISTINCT FROM NEW.meta_tags THEN
      PERFORM silver.write_content_audit(NEW.scope_id,'galaxy',NEW.galaxy_id,'meta_tags',OLD.meta_tags,NEW.meta_tags);
    END IF;
    IF OLD.source_platform IS DISTINCT FROM NEW.source_platform THEN
      PERFORM silver.write_content_audit(NEW.scope_id,'galaxy',NEW.galaxy_id,'source_platform',OLD.source_platform,NEW.source_platform);
    END IF;

  ELSIF TG_TABLE_NAME='lo3rwang_galaxy_media' THEN
    IF OLD.title IS DISTINCT FROM NEW.title THEN
      PERFORM silver.write_content_audit(NEW.scope_id,'galaxy_media',NEW.media_id::text,'title',OLD.title,NEW.title);
    END IF;
    IF OLD.meta_tags IS DISTINCT FROM NEW.meta_tags THEN
      PERFORM silver.write_content_audit(NEW.scope_id,'galaxy_media',NEW.media_id::text,'meta_tags',OLD.meta_tags,NEW.meta_tags);
    END IF;
    IF OLD.style_tags IS DISTINCT FROM NEW.style_tags THEN
      PERFORM silver.write_content_audit(NEW.scope_id,'galaxy_media',NEW.media_id::text,'style_tags',OLD.style_tags,NEW.style_tags);
    END IF;
    IF OLD.source_platform IS DISTINCT FROM NEW.source_platform THEN
      PERFORM silver.write_content_audit(NEW.scope_id,'galaxy_media',NEW.media_id::text,'source_platform',OLD.source_platform,NEW.source_platform);
    END IF;

  ELSIF TG_TABLE_NAME='resource_visibility' THEN
    IF TG_OP='INSERT' THEN
      PERFORM silver.write_content_audit(NEW.scope,NEW.resource_type,NEW.resource_id,'visibility',NULL,NEW.visibility);
      PERFORM silver.write_content_audit(NEW.scope,NEW.resource_type,NEW.resource_id,'projection_level',NULL,NEW.projection_level);
      PERFORM silver.write_content_audit(NEW.scope,NEW.resource_type,NEW.resource_id,'statistics_included',NULL,NEW.statistics_included::text);
      PERFORM silver.write_content_audit(NEW.scope,NEW.resource_type,NEW.resource_id,'show_link',NULL,NEW.show_link::text);
      PERFORM silver.write_content_audit(NEW.scope,NEW.resource_type,NEW.resource_id,'show_source',NULL,NEW.show_source::text);
    ELSE
      IF OLD.visibility IS DISTINCT FROM NEW.visibility THEN
        PERFORM silver.write_content_audit(NEW.scope,NEW.resource_type,NEW.resource_id,'visibility',OLD.visibility,NEW.visibility);
      END IF;
      IF OLD.projection_level IS DISTINCT FROM NEW.projection_level THEN
        PERFORM silver.write_content_audit(NEW.scope,NEW.resource_type,NEW.resource_id,'projection_level',OLD.projection_level,NEW.projection_level);
      END IF;
      IF OLD.statistics_included IS DISTINCT FROM NEW.statistics_included THEN
        PERFORM silver.write_content_audit(NEW.scope,NEW.resource_type,NEW.resource_id,'statistics_included',OLD.statistics_included::text,NEW.statistics_included::text);
      END IF;
      IF OLD.show_link IS DISTINCT FROM NEW.show_link THEN
        PERFORM silver.write_content_audit(NEW.scope,NEW.resource_type,NEW.resource_id,'show_link',OLD.show_link::text,NEW.show_link::text);
      END IF;
      IF OLD.show_source IS DISTINCT FROM NEW.show_source THEN
        PERFORM silver.write_content_audit(NEW.scope,NEW.resource_type,NEW.resource_id,'show_source',OLD.show_source::text,NEW.show_source::text);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END
$$;

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

DROP POLICY IF EXISTS lo3rwang_galaxy_scope_update ON silver.lo3rwang_galaxy;
CREATE POLICY lo3rwang_galaxy_scope_update ON silver.lo3rwang_galaxy FOR UPDATE TO authenticated
USING (silver.can_manage_scope(scope_id))
WITH CHECK (silver.can_manage_scope(scope_id));

DROP POLICY IF EXISTS lo3rwang_galaxy_media_scope_update ON silver.lo3rwang_galaxy_media;
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

DROP POLICY IF EXISTS manage_public_select ON silver.manage;
DROP POLICY IF EXISTS manage_audit_select ON silver.manage;
DROP POLICY IF EXISTS manage_scope_insert ON silver.manage;
DROP POLICY IF EXISTS manage_scope_update ON silver.manage;
DROP POLICY IF EXISTS manage_scope_delete ON silver.manage;
CREATE POLICY manage_public_select ON silver.manage FOR SELECT TO anonymous,authenticated
USING (((record_type IN ('group','scope')) AND active) OR record_type IN ('anchor','period','event'));
CREATE POLICY manage_audit_select ON silver.manage FOR SELECT TO authenticated
USING (record_type='content_audit' AND silver.can_manage_scope(coalesce(target_scope_id,scope_id)));
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
);

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
    OR silver.current_auth_role()='scope:'||
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

CREATE OR REPLACE FUNCTION silver.write_content_audit(
  p_scope_id text,
  p_resource_type text,
  p_resource_id text,
  p_field_name text,
  p_old_value text,
  p_new_value text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'silver','neon_auth','public'
AS $$
DECLARE
  v_actor_email text:=silver.current_auth_email();
  v_actor_name text;
  v_log_scope text;
BEGIN
  SELECT u.name INTO v_actor_name
    FROM neon_auth."user" u
   WHERE lower(u.email)=v_actor_email
   LIMIT 1;

  v_log_scope:=CASE WHEN silver.can_manage_global() THEN 'admin' ELSE p_scope_id END;

  INSERT INTO silver.manage(
    record_type,scope_id,target_scope_id,resource_type,resource_id,
    actor_name,actor_email,field_name,old_value,new_value
  ) VALUES (
    'content_audit',v_log_scope,p_scope_id,p_resource_type,p_resource_id,
    v_actor_name,v_actor_email,p_field_name,p_old_value,p_new_value
  );
END
$$;

CREATE OR REPLACE FUNCTION silver.log_scope_content_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'silver','public'
AS $$
BEGIN
  IF TG_TABLE_NAME='lo3rwang_galaxy' THEN
    IF OLD.title IS DISTINCT FROM NEW.title THEN
      PERFORM silver.write_content_audit(NEW.scope_id,'galaxy',NEW.galaxy_id,'title',OLD.title,NEW.title);
    END IF;
    IF OLD.content IS DISTINCT FROM NEW.content THEN
      PERFORM silver.write_content_audit(NEW.scope_id,'galaxy',NEW.galaxy_id,'content',OLD.content,NEW.content);
    END IF;
    IF OLD.meta_tags IS DISTINCT FROM NEW.meta_tags THEN
      PERFORM silver.write_content_audit(NEW.scope_id,'galaxy',NEW.galaxy_id,'meta_tags',OLD.meta_tags,NEW.meta_tags);
    END IF;
    IF OLD.source_platform IS DISTINCT FROM NEW.source_platform THEN
      PERFORM silver.write_content_audit(NEW.scope_id,'galaxy',NEW.galaxy_id,'source_platform',OLD.source_platform,NEW.source_platform);
    END IF;

  ELSIF TG_TABLE_NAME='lo3rwang_galaxy_media' THEN
    IF OLD.title IS DISTINCT FROM NEW.title THEN
      PERFORM silver.write_content_audit(NEW.scope_id,'galaxy_media',NEW.media_id::text,'title',OLD.title,NEW.title);
    END IF;
    IF OLD.meta_tags IS DISTINCT FROM NEW.meta_tags THEN
      PERFORM silver.write_content_audit(NEW.scope_id,'galaxy_media',NEW.media_id::text,'meta_tags',OLD.meta_tags,NEW.meta_tags);
    END IF;
    IF OLD.style_tags IS DISTINCT FROM NEW.style_tags THEN
      PERFORM silver.write_content_audit(NEW.scope_id,'galaxy_media',NEW.media_id::text,'style_tags',OLD.style_tags,NEW.style_tags);
    END IF;
    IF OLD.source_platform IS DISTINCT FROM NEW.source_platform THEN
      PERFORM silver.write_content_audit(NEW.scope_id,'galaxy_media',NEW.media_id::text,'source_platform',OLD.source_platform,NEW.source_platform);
    END IF;

  ELSIF TG_TABLE_NAME='resource_visibility' THEN
    IF TG_OP='INSERT' THEN
      PERFORM silver.write_content_audit(NEW.scope,NEW.resource_type,NEW.resource_id,'visibility',NULL,NEW.visibility);
      PERFORM silver.write_content_audit(NEW.scope,NEW.resource_type,NEW.resource_id,'projection_level',NULL,NEW.projection_level);
      PERFORM silver.write_content_audit(NEW.scope,NEW.resource_type,NEW.resource_id,'statistics_included',NULL,NEW.statistics_included::text);
      PERFORM silver.write_content_audit(NEW.scope,NEW.resource_type,NEW.resource_id,'show_link',NULL,NEW.show_link::text);
      PERFORM silver.write_content_audit(NEW.scope,NEW.resource_type,NEW.resource_id,'show_source',NULL,NEW.show_source::text);
    ELSE
      IF OLD.visibility IS DISTINCT FROM NEW.visibility THEN
        PERFORM silver.write_content_audit(NEW.scope,NEW.resource_type,NEW.resource_id,'visibility',OLD.visibility,NEW.visibility);
      END IF;
      IF OLD.projection_level IS DISTINCT FROM NEW.projection_level THEN
        PERFORM silver.write_content_audit(NEW.scope,NEW.resource_type,NEW.resource_id,'projection_level',OLD.projection_level,NEW.projection_level);
      END IF;
      IF OLD.statistics_included IS DISTINCT FROM NEW.statistics_included THEN
        PERFORM silver.write_content_audit(NEW.scope,NEW.resource_type,NEW.resource_id,'statistics_included',OLD.statistics_included::text,NEW.statistics_included::text);
      END IF;
      IF OLD.show_link IS DISTINCT FROM NEW.show_link THEN
        PERFORM silver.write_content_audit(NEW.scope,NEW.resource_type,NEW.resource_id,'show_link',OLD.show_link::text,NEW.show_link::text);
      END IF;
      IF OLD.show_source IS DISTINCT FROM NEW.show_source THEN
        PERFORM silver.write_content_audit(NEW.scope,NEW.resource_type,NEW.resource_id,'show_source',OLD.show_source::text,NEW.show_source::text);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END
$$;

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

DROP POLICY IF EXISTS lo3rwang_galaxy_scope_update ON silver.lo3rwang_galaxy;
CREATE POLICY lo3rwang_galaxy_scope_update ON silver.lo3rwang_galaxy FOR UPDATE TO authenticated
USING (silver.can_manage_scope(scope_id))
WITH CHECK (silver.can_manage_scope(scope_id));

DROP POLICY IF EXISTS lo3rwang_galaxy_media_scope_update ON silver.lo3rwang_galaxy_media;
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

DROP POLICY IF EXISTS manage_public_select ON silver.manage;
DROP POLICY IF EXISTS manage_audit_select ON silver.manage;
DROP POLICY IF EXISTS manage_scope_insert ON silver.manage;
DROP POLICY IF EXISTS manage_scope_update ON silver.manage;
DROP POLICY IF EXISTS manage_scope_delete ON silver.manage;
CREATE POLICY manage_public_select ON silver.manage FOR SELECT TO anonymous,authenticated
USING (((record_type IN ('group','scope')) AND active) OR record_type IN ('anchor','period','event'));
CREATE POLICY manage_audit_select ON silver.manage FOR SELECT TO authenticated
USING (record_type='content_audit' AND silver.can_manage_scope(coalesce(target_scope_id,scope_id)));
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
