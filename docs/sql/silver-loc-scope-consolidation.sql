-- Consolidate scope metadata, relations, page grants, affiliations and audit history.
-- Apply in one transaction; each MIGRATION STEP is one SQL statement.
-- MIGRATION STEP 1
CREATE TABLE silver.loc_scope (
  record_id uuid DEFAULT gen_random_uuid() NOT NULL,
  record_type text NOT NULL,
  scope_id text,
  legacy_scope_id text,
  scope_name text,
  scope_kind text,
  scope_type text,
  domain text,
  alias_name text,
  label text,
  parent_scope_id text,
  mount_host text,
  mount_path text,
  local_routes text[] DEFAULT '{}'::text[] NOT NULL,
  route_patterns text[] DEFAULT '{}'::text[] NOT NULL,
  compatibility_routes text[] DEFAULT '{}'::text[] NOT NULL,
  primary_link_label text,
  primary_link_href text,
  role_link_label text,
  role_link_href text,
  home_link_labels text[] DEFAULT '{}'::text[] NOT NULL,
  home_link_hrefs text[] DEFAULT '{}'::text[] NOT NULL,
  search_collection text,
  context_view text,
  rankings_view text,
  ranking_title text,
  context_table_name text,
  contact_label text,
  contact_email text,
  extra_privileges text,
  graph_enabled boolean DEFAULT false NOT NULL,
  include_in_admin_graph boolean DEFAULT true NOT NULL,
  include_in_global_search boolean DEFAULT true NOT NULL,
  include_in_global_stats boolean DEFAULT true NOT NULL,
  display_order integer,
  display_text text,
  active boolean DEFAULT true NOT NULL,
  default_theme_id text DEFAULT 'theme-7'::text NOT NULL,
  relation_id uuid,
  child_scope_id text,
  relation_type text DEFAULT 'parent_child'::text NOT NULL,
  created_by text,
  requested_by text,
  reviewed_by text,
  status text,
  reason text,
  review_note text,
  reviewed_at timestamp with time zone,
  user_id text,
  access_level text,
  case_id text,
  granted_by text,
  granted_at timestamp with time zone,
  work_id text,
  affiliation_source text,
  rule_key text,
  display_label text,
  search_included boolean,
  statistics_included boolean,
  manual_override boolean,
  override_action text,
  note text,
  resource_type text,
  resource_id text,
  actor_id text,
  changed_at timestamp with time zone,
  field_name text,
  old_value text,
  new_value text,
  target_scope_id text,
  actor_name text,
  actor_email text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
 PRIMARY KEY (record_id),
 CONSTRAINT loc_scope_check CHECK (((record_type <> 'scope'::text) OR ((scope_id IS NOT NULL) AND (scope_id ~ '^[A-Za-z][A-Za-z0-9_.-]{0,62}$'::text)))),
 CONSTRAINT loc_scope_check1 CHECK (((record_type <> 'scope'::text) OR (default_theme_id ~ '^theme-[1-8]$'::text))),
 CONSTRAINT loc_scope_check2 CHECK (((record_type <> ALL (ARRAY['relation'::text, 'relation_request'::text])) OR ((parent_scope_id IS NOT NULL) AND (child_scope_id IS NOT NULL) AND (parent_scope_id <> child_scope_id)))),
 CONSTRAINT loc_scope_check3 CHECK (((record_type <> 'relation_request'::text) OR (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'revoked'::text])))),
 CONSTRAINT loc_scope_check4 CHECK (((record_type <> 'access_grant'::text) OR (access_level = ANY (ARRAY['scope_manager'::text, 'page_manager'::text, 'privacy_dispute_handler'::text])))),
 CONSTRAINT loc_scope_check5 CHECK (((record_type <> 'work_affiliation'::text) OR (relation_type = ANY (ARRAY['primary'::text, 'secondary'::text])))),
 CONSTRAINT loc_scope_check6 CHECK (((record_type <> 'work_affiliation'::text) OR (affiliation_source = ANY (ARRAY['auto'::text, 'manual'::text, 'override'::text])))),
 CONSTRAINT loc_scope_check7 CHECK (((record_type <> 'work_affiliation'::text) OR (override_action IS NULL) OR (override_action = ANY (ARRAY['include'::text, 'exclude'::text, 'review'::text, 'replace_relation'::text])))),
 CONSTRAINT loc_scope_record_type_check CHECK ((record_type = ANY (ARRAY['scope'::text, 'relation'::text, 'relation_request'::text, 'access_grant'::text, 'work_affiliation'::text, 'content_audit'::text])))
);

-- MIGRATION STEP 2
INSERT INTO silver.loc_scope (record_type,scope_id,legacy_scope_id,scope_name,scope_kind,parent_scope_id,context_table_name,graph_enabled,include_in_admin_graph,include_in_global_search,include_in_global_stats,display_order,display_text,active,created_at,updated_at,default_theme_id,contact_label,contact_email,extra_privileges)
SELECT 'scope',CASE WHEN r.scope_id='moon-runes' THEN 'runes' ELSE r.scope_id END,CASE WHEN r.scope_id='moon-runes' THEN r.scope_id END,r.scope_name,r.scope_kind,CASE WHEN r.parent_scope_id='moon-runes' THEN 'runes' ELSE r.parent_scope_id END,r.context_table_name,r.graph_enabled,r.include_in_admin_graph,r.include_in_global_search,r.include_in_global_stats,r.display_order,r.display_text,r.active,r.created_at,r.updated_at,r.default_theme_id,c.contact_label,c.contact_email,c.extra_privileges FROM silver.loc_scope_registry r LEFT JOIN api.scope_contacts c ON c.scope_id=r.scope_id;

-- MIGRATION STEP 3
UPDATE silver.loc_scope s SET scope_type=m.scope_type, domain=m.domain, alias_name=m.alias_name, label=m.label, mount_host=m.mount_host, mount_path=m.mount_path, local_routes=m.local_routes, route_patterns=m.route_patterns, compatibility_routes=m.compatibility_routes, primary_link_label=m.primary_link_label, primary_link_href=m.primary_link_href, role_link_label=m.role_link_label, role_link_href=m.role_link_href, home_link_labels=m.home_link_labels, home_link_hrefs=m.home_link_hrefs, search_collection=m.search_collection, context_view=m.context_view, rankings_view=m.rankings_view, ranking_title=m.ranking_title FROM jsonb_to_recordset('[{"scope_id":"runes","scope_type":"domain","domain":"lrunes.lo3rwang.cc","alias_name":null,"label":"月之符文","mount_host":"loc.lo3rwang.cc","mount_path":"/lrunes","local_routes":["algorithm","game","list","duel/one","duel/daily","duel/two","duel/three","duel/five","duel/ow3gs","daily/log","daily/trend"],"route_patterns":["list/:group","list/:group/:rune"],"compatibility_routes":[],"primary_link_label":"Moon（月之符文）","primary_link_href":"https://lrunes.lo3rwang.cc/","role_link_label":"管理者頁面","role_link_href":"https://loc.lo3rwang.cc/lo3rwang/","home_link_labels":["回月典首頁"],"home_link_hrefs":["https://loc.lo3rwang.cc/"],"search_collection":"月之符文","context_view":"api.runes_context_entries","rankings_view":"api.runes_rankings","ranking_title":"月之符文排行榜"},{"scope_id":"lo3rwang","scope_type":"directory","domain":"dlwang.lo3rwang.cc","alias_name":"dlwang","label":"作者簡介","mount_host":"loc.lo3rwang.cc","mount_path":"/lo3rwang","local_routes":["old","work","other"],"route_patterns":[],"compatibility_routes":[],"primary_link_label":"簡介","primary_link_href":"https://loc.lo3rwang.cc/lo3rwang/","role_link_label":"管理者介紹","role_link_href":"https://loc.lo3rwang.cc/lo3rwang/","home_link_labels":["回月典首頁"],"home_link_hrefs":["https://loc.lo3rwang.cc/"],"search_collection":"lo3rwang","context_view":"api.lo3rwang_context_entries","rankings_view":"api.lo3rwang_rankings","ranking_title":"作者排行榜"},{"scope_id":"loc","scope_type":"domain","domain":"loc.lo3rwang.cc","alias_name":null,"label":"月典","mount_host":null,"mount_path":null,"local_routes":[],"route_patterns":[],"compatibility_routes":[],"primary_link_label":"月之符文","primary_link_href":"https://lrunes.lo3rwang.cc/","role_link_label":"作者介紹","role_link_href":"https://loc.lo3rwang.cc/lo3rwang/","home_link_labels":["回月典首頁"],"home_link_hrefs":["https://loc.lo3rwang.cc/"],"search_collection":"all","context_view":"api.loc_context_entries","rankings_view":"api.loc_rankings","ranking_title":"總排行榜"},{"scope_id":"lo3rwang_galaxy","scope_type":"collection","domain":null,"alias_name":null,"label":"歌詞、心情文、小說等衍生作品","mount_host":null,"mount_path":null,"local_routes":[],"route_patterns":[],"compatibility_routes":[],"primary_link_label":"lo3rwang Galaxy","primary_link_href":null,"role_link_label":"lo3rwang Galaxy","role_link_href":null,"home_link_labels":["回月典首頁"],"home_link_hrefs":["https://loc.lo3rwang.cc/"],"search_collection":"lo3rwang_galaxy","context_view":null,"rankings_view":null,"ranking_title":"排行榜"},{"scope_id":"admin","scope_type":"domain","domain":"admin.lo3rwang.cc","alias_name":null,"label":"治理管理","mount_host":null,"mount_path":null,"local_routes":[],"route_patterns":[],"compatibility_routes":[],"primary_link_label":"治理管理","primary_link_href":"https://admin.lo3rwang.cc/","role_link_label":"治理管理","role_link_href":"https://admin.lo3rwang.cc/","home_link_labels":["回治理管理","回月典首頁"],"home_link_hrefs":["https://admin.lo3rwang.cc/","https://loc.lo3rwang.cc/"],"search_collection":"治理","context_view":null,"rankings_view":null,"ranking_title":"排行榜"}]'::jsonb) AS m(scope_id text,scope_type text,domain text,alias_name text,label text,mount_host text,mount_path text,local_routes text[],route_patterns text[],compatibility_routes text[],primary_link_label text,primary_link_href text,role_link_label text,role_link_href text,home_link_labels text[],home_link_hrefs text[],search_collection text,context_view text,rankings_view text,ranking_title text) WHERE s.record_type='scope' AND s.scope_id=m.scope_id;

-- MIGRATION STEP 4
INSERT INTO silver.loc_scope (record_type,scope_id,scope_name,scope_kind,parent_scope_id,display_order,display_text,scope_type,domain,label,primary_link_label,primary_link_href,role_link_label,role_link_href,home_link_labels,home_link_hrefs,search_collection) SELECT 'scope','admin','治理管理','admin_scope','loc',5,'治理管理','domain','admin.lo3rwang.cc','治理管理','治理管理','https://admin.lo3rwang.cc/','治理管理','https://admin.lo3rwang.cc/',ARRAY['回治理管理','回月典首頁'],ARRAY['https://admin.lo3rwang.cc/','https://loc.lo3rwang.cc/'],'治理' WHERE NOT EXISTS (SELECT 1 FROM silver.loc_scope WHERE record_type='scope' AND scope_id='admin');

-- MIGRATION STEP 5
INSERT INTO silver.loc_scope (record_type,parent_scope_id,child_scope_id,relation_type,created_by,created_at,record_id) SELECT 'relation',CASE WHEN parent_scope_id='moon-runes' THEN 'runes' ELSE parent_scope_id END,CASE WHEN child_scope_id='moon-runes' THEN 'runes' ELSE child_scope_id END,relation_type,created_by,created_at,id FROM api.scope_relations;

-- MIGRATION STEP 6
INSERT INTO silver.loc_scope (record_type,parent_scope_id,child_scope_id,relation_type,status,reason,review_note,requested_by,reviewed_by,created_at,reviewed_at,record_id) SELECT 'relation_request',CASE WHEN parent_scope_id='moon-runes' THEN 'runes' ELSE parent_scope_id END,CASE WHEN child_scope_id='moon-runes' THEN 'runes' ELSE child_scope_id END,relation_type,status,reason,review_note,requested_by,reviewed_by,created_at,reviewed_at,id FROM api.scope_relation_requests;

-- MIGRATION STEP 7
INSERT INTO silver.loc_scope (record_type,scope_id,user_id,access_level,case_id,created_at,granted_by,granted_at) SELECT 'access_grant',CASE WHEN scope_id='moon-runes' THEN 'runes' ELSE scope_id END,user_id,access_level,case_id,created_at,granted_by,granted_at FROM api.scope_access_grants;

-- MIGRATION STEP 8
INSERT INTO silver.loc_scope (record_type,work_id,scope_id,relation_type,affiliation_source,rule_key,display_label,search_included,statistics_included,manual_override,override_action,note,created_at,updated_at) SELECT 'work_affiliation',work_id,CASE WHEN scope_id='moon-runes' THEN 'runes' ELSE scope_id END,relation_type,affiliation_source,rule_key,display_label,search_included,statistics_included,manual_override,override_action,note,created_at,updated_at FROM silver.work_scope_affiliations;

-- MIGRATION STEP 9
INSERT INTO silver.loc_scope (record_type,record_id,scope_id,resource_type,resource_id,actor_id,changed_at,field_name,old_value,new_value,target_scope_id,actor_name,actor_email) SELECT 'content_audit',audit_id,CASE WHEN scope_id='moon-runes' THEN 'runes' ELSE scope_id END,resource_type,resource_id,actor_id,changed_at,field_name,old_value,new_value,target_scope_id,actor_name,actor_email FROM silver.scope_content_audit;

-- MIGRATION STEP 10
INSERT INTO silver.loc_scope (record_type,parent_scope_id,child_scope_id,relation_type) SELECT 'relation',parent_scope_id,scope_id,'parent_child' FROM silver.loc_scope s WHERE s.record_type='scope' AND parent_scope_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM silver.loc_scope r WHERE r.record_type='relation' AND r.parent_scope_id=s.parent_scope_id AND r.child_scope_id=s.scope_id);

-- MIGRATION STEP 11
DROP VIEW IF EXISTS api.lo3rwang_work_affiliations;

-- MIGRATION STEP 12
DROP VIEW IF EXISTS api.loc_work_affiliations;

-- MIGRATION STEP 13
DROP VIEW IF EXISTS api.runes_work_affiliations;

-- MIGRATION STEP 14
DROP TABLE api.scope_relations CASCADE;

-- MIGRATION STEP 15
DROP TABLE api.scope_relation_requests CASCADE;

-- MIGRATION STEP 16
DROP TABLE api.scope_access_grants CASCADE;

-- MIGRATION STEP 17
DROP TABLE api.scope_contacts CASCADE;

-- MIGRATION STEP 18
DROP TABLE silver.loc_scope_registry CASCADE;

-- MIGRATION STEP 19
DROP TABLE silver.scope_content_audit CASCADE;

-- MIGRATION STEP 20
DROP TABLE silver.work_scope_affiliations CASCADE;

-- MIGRATION STEP 21
CREATE VIEW api.lo3rwang_work_affiliations WITH (security_invoker=true) AS  SELECT work_id,
    scope_id,
    relation_type,
    affiliation_source,
    rule_key,
    display_label,
    search_included,
    statistics_included,
    manual_override,
    override_action,
    note,
    created_at,
    updated_at
   FROM silver.loc_scope
  WHERE ((record_type = 'work_affiliation'::text) AND (scope_id = 'lo3rwang'::text) AND (COALESCE(override_action, 'include'::text) <> 'exclude'::text));

-- MIGRATION STEP 22
CREATE VIEW api.loc_work_affiliations WITH (security_invoker=true) AS  SELECT work_id,
    scope_id,
    relation_type,
    affiliation_source,
    rule_key,
    display_label,
    search_included,
    statistics_included,
    manual_override,
    override_action,
    note,
    created_at,
    updated_at
   FROM silver.loc_scope
  WHERE ((record_type = 'work_affiliation'::text) AND (COALESCE(override_action, 'include'::text) <> 'exclude'::text));

-- MIGRATION STEP 23
CREATE VIEW api.runes_work_affiliations WITH (security_invoker=true) AS  SELECT work_id,
    scope_id,
    relation_type,
    affiliation_source,
    rule_key,
    display_label,
    search_included,
    statistics_included,
    manual_override,
    override_action,
    note,
    created_at,
    updated_at
   FROM silver.loc_scope
  WHERE ((record_type = 'work_affiliation'::text) AND (scope_id = 'runes'::text) AND (COALESCE(override_action, 'include'::text) <> 'exclude'::text));

-- MIGRATION STEP 24
CREATE VIEW api.scope_access_grants WITH (security_invoker=true) AS  SELECT user_id,
    scope_id,
    access_level,
    case_id,
    created_at,
    granted_by,
    granted_at
   FROM silver.loc_scope
  WHERE (record_type = 'access_grant'::text);

-- MIGRATION STEP 25
CREATE VIEW api.scope_contacts WITH (security_invoker=true) AS  SELECT COALESCE(legacy_scope_id, scope_id) AS scope_id,
    contact_label,
    contact_email,
    updated_at,
    extra_privileges
   FROM silver.loc_scope
  WHERE ((record_type = 'scope'::text) AND ((contact_label IS NOT NULL) OR (contact_email IS NOT NULL) OR (extra_privileges IS NOT NULL)));

-- MIGRATION STEP 26
CREATE VIEW api.scope_relation_requests WITH (security_invoker=true) AS  SELECT record_id AS id,
    parent_scope_id,
    child_scope_id,
    relation_type,
    status,
    reason,
    review_note,
    requested_by,
    reviewed_by,
    created_at,
    reviewed_at
   FROM silver.loc_scope
  WHERE (record_type = 'relation_request'::text);

-- MIGRATION STEP 27
CREATE VIEW api.scope_relations WITH (security_invoker=true) AS  SELECT record_id AS id,
    parent_scope_id,
    child_scope_id,
    relation_type,
    created_by,
    created_at
   FROM silver.loc_scope
  WHERE (record_type = 'relation'::text);

-- MIGRATION STEP 28
CREATE VIEW silver.loc_scope_registry WITH (security_invoker=true) AS  SELECT COALESCE(legacy_scope_id, scope_id) AS scope_id,
    scope_name,
    scope_kind,
    parent_scope_id,
    context_table_name,
    graph_enabled,
    include_in_admin_graph,
    include_in_global_search,
    include_in_global_stats,
    display_order,
    display_text,
    active,
    created_at,
    updated_at,
    default_theme_id
   FROM silver.loc_scope
  WHERE (record_type = 'scope'::text);

-- MIGRATION STEP 29
CREATE VIEW silver.scope_content_audit WITH (security_invoker=true) AS  SELECT record_id AS audit_id,
    scope_id,
    resource_type,
    resource_id,
    actor_id,
    COALESCE(changed_at, created_at) AS changed_at,
    field_name,
    old_value,
    new_value,
    target_scope_id,
    actor_name,
    actor_email
   FROM silver.loc_scope
  WHERE (record_type = 'content_audit'::text);

-- MIGRATION STEP 30
CREATE VIEW silver.work_scope_affiliations WITH (security_invoker=true) AS  SELECT work_id,
    scope_id,
    relation_type,
    affiliation_source,
    rule_key,
    display_label,
    search_included,
    statistics_included,
    manual_override,
    override_action,
    note,
    created_at,
    updated_at
   FROM silver.loc_scope
  WHERE (record_type = 'work_affiliation'::text);

-- MIGRATION STEP 31
CREATE OR REPLACE FUNCTION api.current_scope_user_id()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'auth', 'pg_temp'
AS $function$
 SELECT nullif(auth.user_id(),'');
$function$;

-- MIGRATION STEP 32
CREATE OR REPLACE FUNCTION api.has_scope_access(p_scope_id text, p_access_levels text[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'api', 'silver', 'public'
AS $function$
 SELECT EXISTS(SELECT 1 FROM silver.loc_scope g WHERE g.record_type='access_grant'
  AND g.user_id=api.current_scope_user_id() AND g.scope_id=p_scope_id
  AND g.access_level=ANY(coalesce(p_access_levels,'{}'::text[])));
$function$;

-- MIGRATION STEP 33
CREATE OR REPLACE FUNCTION api.can_manage_scope(p_scope_id text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'api', 'silver', 'public'
AS $function$
 SELECT api.has_scope_access('admin',ARRAY['scope_manager']::text[])
  OR (p_scope_id<>'admin' AND api.has_scope_access(p_scope_id,ARRAY['scope_manager']::text[]));
$function$;

-- MIGRATION STEP 34
CREATE OR REPLACE FUNCTION api.can_manage_scope_page(p_scope_id text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'api', 'silver', 'public'
AS $function$
 SELECT api.can_manage_scope(p_scope_id) OR (p_scope_id<>'admin' AND api.has_scope_access(p_scope_id,ARRAY['page_manager']::text[]));
$function$;

-- MIGRATION STEP 35
CREATE OR REPLACE FUNCTION api.can_review_scope_relation(p_parent_scope_id text, p_child_scope_id text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'api', 'silver', 'public'
AS $function$
 SELECT api.has_scope_access('admin',ARRAY['scope_manager']::text[])
  OR (api.has_scope_access(p_parent_scope_id,ARRAY['scope_manager']::text[])
      AND api.has_scope_access(p_child_scope_id,ARRAY['scope_manager']::text[]));
$function$;

-- MIGRATION STEP 36
CREATE OR REPLACE FUNCTION api.can_manage_context_scope(p_scope_id text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'api', 'silver', 'public'
AS $function$
 SELECT api.has_scope_access('admin',ARRAY['scope_manager']::text[]) OR api.has_scope_access(p_scope_id,ARRAY['scope_manager']::text[])
  OR EXISTS(SELECT 1 FROM silver.loc_scope g WHERE g.record_type='access_grant' AND g.user_id=api.current_scope_user_id()
   AND g.scope_id=p_scope_id AND g.access_level='page_manager' AND g.case_id='context');
$function$;

-- MIGRATION STEP 37
CREATE OR REPLACE FUNCTION api.can_manage_culture_scope(p_scope_id text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'api', 'silver', 'public'
AS $function$
 SELECT api.has_scope_access('admin',ARRAY['scope_manager']::text[]) OR api.has_scope_access(p_scope_id,ARRAY['scope_manager']::text[])
  OR EXISTS(SELECT 1 FROM silver.loc_scope g WHERE g.record_type='access_grant' AND g.user_id=api.current_scope_user_id()
   AND g.scope_id=p_scope_id AND g.access_level='page_manager' AND g.case_id='culture');
$function$;

-- MIGRATION STEP 38
CREATE OR REPLACE FUNCTION api.validate_scope_relation_edge(p_parent_scope_id text, p_child_scope_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'api', 'silver', 'public'
AS $function$
DECLARE pd integer; cd integer;
BEGIN
 IF nullif(trim(p_parent_scope_id),'') IS NULL OR nullif(trim(p_child_scope_id),'') IS NULL
   OR p_parent_scope_id !~ '^[A-Za-z][A-Za-z0-9_.-]{0,62}$' OR p_child_scope_id !~ '^[A-Za-z][A-Za-z0-9_.-]{0,62}$'
 THEN RAISE EXCEPTION 'Invalid Scope relation endpoint' USING ERRCODE='check_violation'; END IF;
 IF p_parent_scope_id=p_child_scope_id THEN RAISE EXCEPTION 'Scope relation cannot point to itself' USING ERRCODE='check_violation'; END IF;
 IF NOT EXISTS(SELECT 1 FROM silver.loc_scope WHERE record_type='scope' AND scope_id=p_parent_scope_id)
  OR NOT EXISTS(SELECT 1 FROM silver.loc_scope WHERE record_type='scope' AND scope_id=p_child_scope_id)
 THEN RAISE EXCEPTION 'Scope relation endpoint does not exist' USING ERRCODE='foreign_key_violation'; END IF;
 IF EXISTS(
  WITH RECURSIVE chain(id,path) AS (
   SELECT parent_scope_id,ARRAY[parent_scope_id]::text[] FROM api.scope_relations WHERE child_scope_id=p_parent_scope_id
   UNION ALL SELECT r.parent_scope_id,c.path||r.parent_scope_id FROM api.scope_relations r JOIN chain c ON c.id=r.child_scope_id
    WHERE NOT r.parent_scope_id=ANY(c.path)
  ) SELECT 1 FROM chain WHERE id=p_child_scope_id
 ) THEN RAISE EXCEPTION 'Scope relation would create a cycle' USING ERRCODE='check_violation'; END IF;
 WITH RECURSIVE chain(id,depth,path) AS (
  SELECT parent_scope_id,1,ARRAY[parent_scope_id]::text[] FROM api.scope_relations WHERE child_scope_id=p_parent_scope_id
  UNION ALL SELECT r.parent_scope_id,c.depth+1,c.path||r.parent_scope_id FROM api.scope_relations r JOIN chain c ON c.id=r.child_scope_id
   WHERE NOT r.parent_scope_id=ANY(c.path)
 ) SELECT 1+coalesce(max(depth),0) INTO pd FROM chain;
 WITH RECURSIVE chain(id,depth,path) AS (
  SELECT child_scope_id,1,ARRAY[child_scope_id]::text[] FROM api.scope_relations WHERE parent_scope_id=p_child_scope_id
  UNION ALL SELECT r.child_scope_id,c.depth+1,c.path||r.child_scope_id FROM api.scope_relations r JOIN chain c ON c.id=r.parent_scope_id
   WHERE NOT r.child_scope_id=ANY(c.path)
 ) SELECT coalesce(max(depth),0) INTO cd FROM chain;
 IF pd>4 OR cd>4 OR pd+1+cd>8 THEN RAISE EXCEPTION 'Scope tree depth limit exceeded' USING ERRCODE='check_violation'; END IF;
END;
$function$;

-- MIGRATION STEP 39
CREATE OR REPLACE FUNCTION api.grant_scope_access(p_user_id text, p_scope_id text, p_access_level text, p_case_id text)
 RETURNS api.scope_access_grants
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'api', 'silver', 'public'
AS $function$
DECLARE uid text:=api.current_scope_user_id(); answer api.scope_access_grants;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Authenticated Neon session required' USING ERRCODE='insufficient_privilege'; END IF;
 IF NOT api.can_manage_scope(p_scope_id) THEN RAISE EXCEPTION 'Cannot grant access to this Scope' USING ERRCODE='insufficient_privilege'; END IF;
 IF p_access_level NOT IN ('scope_manager','page_manager','privacy_dispute_handler') THEN RAISE EXCEPTION 'Invalid access level' USING ERRCODE='check_violation'; END IF;
 IF nullif(trim(p_user_id),'') IS NULL OR nullif(trim(p_case_id),'') IS NULL THEN RAISE EXCEPTION 'User and case ids are required' USING ERRCODE='check_violation'; END IF;
 INSERT INTO silver.loc_scope(record_type,scope_id,user_id,access_level,case_id,granted_by,granted_at)
 VALUES('access_grant',trim(p_scope_id),trim(p_user_id),p_access_level,trim(p_case_id),uid,now())
 ON CONFLICT(user_id,scope_id,access_level,case_id) WHERE record_type='access_grant'
 DO UPDATE SET granted_by=excluded.granted_by,granted_at=now(),updated_at=now();
 SELECT * INTO answer FROM api.scope_access_grants WHERE user_id=trim(p_user_id) AND scope_id=trim(p_scope_id)
  AND access_level=p_access_level AND case_id=trim(p_case_id);
 RETURN answer;
END;
$function$;

-- MIGRATION STEP 40
CREATE OR REPLACE FUNCTION api.revoke_scope_access(p_user_id text, p_scope_id text, p_access_level text, p_case_id text)
 RETURNS SETOF api.scope_access_grants
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'api', 'silver', 'public'
AS $function$
DECLARE answer api.scope_access_grants;
BEGIN
 IF api.current_scope_user_id() IS NULL THEN RAISE EXCEPTION 'Authenticated Neon session required' USING ERRCODE='insufficient_privilege'; END IF;
 IF NOT api.can_manage_scope(p_scope_id) THEN RAISE EXCEPTION 'Cannot revoke access to this Scope' USING ERRCODE='insufficient_privilege'; END IF;
 DELETE FROM silver.loc_scope WHERE record_type='access_grant' AND user_id=trim(p_user_id) AND scope_id=trim(p_scope_id)
  AND access_level=trim(p_access_level) AND case_id=trim(p_case_id)
 RETURNING user_id,scope_id,access_level,case_id,created_at,granted_by,granted_at INTO answer;
 IF FOUND THEN RETURN NEXT answer; END IF;
 RETURN;
END;
$function$;

-- MIGRATION STEP 41
CREATE OR REPLACE FUNCTION api.request_scope_relation(p_parent_scope_id text, p_child_scope_id text, p_relation_type text DEFAULT 'parent_child'::text, p_reason text DEFAULT NULL::text)
 RETURNS api.scope_relation_requests
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'api', 'silver', 'public'
AS $function$
DECLARE uid text:=api.current_scope_user_id(); rid uuid; answer api.scope_relation_requests;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Authenticated Neon session required' USING ERRCODE='insufficient_privilege'; END IF;
 IF NOT(api.can_manage_scope(p_parent_scope_id) OR api.can_manage_scope(p_child_scope_id)) THEN RAISE EXCEPTION 'Cannot request this Scope relation' USING ERRCODE='insufficient_privilege'; END IF;
 PERFORM api.validate_scope_relation_edge(p_parent_scope_id,p_child_scope_id);
 INSERT INTO silver.loc_scope(record_type,scope_id,parent_scope_id,child_scope_id,relation_type,status,reason,requested_by)
 VALUES('relation_request',trim(p_child_scope_id),trim(p_parent_scope_id),trim(p_child_scope_id),coalesce(nullif(trim(p_relation_type),''),'parent_child'),'pending',nullif(trim(p_reason),''),uid)
 RETURNING record_id INTO rid;
 SELECT * INTO answer FROM api.scope_relation_requests WHERE id=rid;
 RETURN answer;
END;
$function$;

-- MIGRATION STEP 42
CREATE OR REPLACE FUNCTION api.decide_scope_relation_request(p_request_id uuid, p_status text, p_review_note text DEFAULT NULL::text, p_reviewed_by text DEFAULT NULL::text)
 RETURNS api.scope_relation_requests
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'api', 'silver', 'public'
AS $function$
DECLARE rowdata silver.loc_scope; answer api.scope_relation_requests; uid text:=api.current_scope_user_id();
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Authenticated Neon session required' USING ERRCODE='insufficient_privilege'; END IF;
 IF p_status NOT IN ('approved','rejected','revoked') THEN RAISE EXCEPTION 'Invalid request status' USING ERRCODE='check_violation'; END IF;
 SELECT * INTO rowdata FROM silver.loc_scope WHERE record_type='relation_request' AND record_id=p_request_id FOR UPDATE;
 IF NOT FOUND OR rowdata.status<>'pending' THEN RAISE EXCEPTION 'Pending request not found' USING ERRCODE='no_data_found'; END IF;
 IF NOT api.can_review_scope_relation(rowdata.parent_scope_id,rowdata.child_scope_id) THEN RAISE EXCEPTION 'Cannot review this Scope relation' USING ERRCODE='insufficient_privilege'; END IF;
 IF p_status='approved' AND rowdata.requested_by=uid THEN RAISE EXCEPTION 'Requester cannot approve own request' USING ERRCODE='insufficient_privilege'; END IF;
 IF p_status='approved' THEN
  PERFORM pg_advisory_xact_lock(hashtextextended('scope-governance-relation-approval',0));
  PERFORM api.validate_scope_relation_edge(rowdata.parent_scope_id,rowdata.child_scope_id);
  DELETE FROM silver.loc_scope WHERE record_type='relation' AND child_scope_id=rowdata.child_scope_id;
  INSERT INTO silver.loc_scope(record_type,scope_id,parent_scope_id,child_scope_id,relation_type,created_by)
  VALUES('relation',rowdata.child_scope_id,rowdata.parent_scope_id,rowdata.child_scope_id,rowdata.relation_type,uid);
  UPDATE silver.loc_scope SET parent_scope_id=rowdata.parent_scope_id,relation_type=rowdata.relation_type,updated_at=now()
   WHERE record_type='scope' AND scope_id=rowdata.child_scope_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Child Scope does not exist' USING ERRCODE='foreign_key_violation'; END IF;
 END IF;
 UPDATE silver.loc_scope SET status=p_status,review_note=nullif(trim(p_review_note),''),reviewed_by=uid,reviewed_at=now(),updated_at=now()
  WHERE record_type='relation_request' AND record_id=p_request_id;
 SELECT * INTO answer FROM api.scope_relation_requests WHERE id=p_request_id;
 RETURN answer;
END;
$function$;

-- MIGRATION STEP 43
CREATE OR REPLACE FUNCTION api.enforce_loc_scope_row()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'api', 'silver', 'public'
AS $function$
DECLARE used boolean;
BEGIN
 IF TG_OP='DELETE' AND OLD.record_type='scope' THEN
  IF EXISTS(SELECT 1 FROM silver.loc_scope r WHERE r.record_id<>OLD.record_id
    AND ((r.record_type='scope' AND r.parent_scope_id=OLD.scope_id)
      OR (r.record_type IN ('relation_request','access_grant','work_affiliation','content_audit')
        AND OLD.scope_id IN (r.scope_id,r.parent_scope_id,r.child_scope_id,r.target_scope_id))))
  THEN RAISE EXCEPTION 'Scope % is referenced; deactivate it instead',OLD.scope_id USING ERRCODE='foreign_key_violation'; END IF;
  DELETE FROM silver.loc_scope WHERE record_type='relation' AND OLD.scope_id IN (parent_scope_id,child_scope_id);
  IF to_regclass('silver.loc_timeline_entries') IS NOT NULL THEN
   EXECUTE 'SELECT EXISTS(SELECT 1 FROM silver.loc_timeline_entries WHERE scope_id=$1)' INTO used USING OLD.scope_id;
   IF used THEN RAISE EXCEPTION 'Scope % has timeline entries; deactivate it instead',OLD.scope_id USING ERRCODE='foreign_key_violation'; END IF;
  END IF;
  IF to_regclass('silver.resource_visibility') IS NOT NULL THEN
   EXECUTE 'SELECT EXISTS(SELECT 1 FROM silver.resource_visibility WHERE scope=$1)' INTO used USING OLD.scope_id;
   IF used THEN RAISE EXCEPTION 'Scope % has visibility settings; deactivate it instead',OLD.scope_id USING ERRCODE='foreign_key_violation'; END IF;
  END IF;
  IF to_regclass('silver.content_relations') IS NOT NULL THEN
   EXECUTE 'SELECT EXISTS(SELECT 1 FROM silver.content_relations WHERE scope_id=$1)' INTO used USING OLD.scope_id;
   IF used THEN RAISE EXCEPTION 'Scope % has content relations; deactivate it instead',OLD.scope_id USING ERRCODE='foreign_key_violation'; END IF;
  END IF;
  RETURN OLD;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 IF TG_OP='UPDATE' AND NEW.record_type IS DISTINCT FROM OLD.record_type THEN
  RAISE EXCEPTION 'Scope record type cannot change' USING ERRCODE='check_violation';
 END IF;
 IF TG_OP='UPDATE' AND OLD.record_type='scope' AND NEW.scope_id IS DISTINCT FROM OLD.scope_id THEN
  RAISE EXCEPTION 'Scope id is immutable' USING ERRCODE='check_violation';
 END IF;
 IF NEW.record_type='scope' AND NEW.parent_scope_id IS NOT NULL THEN
  IF TG_OP='INSERT' THEN
   IF NEW.parent_scope_id=NEW.scope_id OR NOT EXISTS(SELECT 1 FROM silver.loc_scope p WHERE p.record_type='scope' AND p.scope_id=NEW.parent_scope_id)
   THEN RAISE EXCEPTION 'Parent Scope does not exist' USING ERRCODE='foreign_key_violation'; END IF;
  ELSE
   PERFORM api.validate_scope_relation_edge(NEW.parent_scope_id,NEW.scope_id);
  END IF;
 END IF;
 IF NEW.record_type='relation' THEN PERFORM api.validate_scope_relation_edge(NEW.parent_scope_id,NEW.child_scope_id); END IF;
 IF NEW.record_type='scope' THEN NEW.updated_at:=now(); END IF;
 RETURN NEW;
END;
$function$;

-- MIGRATION STEP 44
CREATE OR REPLACE FUNCTION api.sync_loc_scope_parent_relation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'api', 'silver', 'public'
AS $function$
BEGIN
 IF NEW.record_type<>'scope' THEN RETURN NEW; END IF;
 IF NEW.parent_scope_id IS NULL THEN
  DELETE FROM silver.loc_scope WHERE record_type='relation' AND child_scope_id=NEW.scope_id;
 ELSE
  DELETE FROM silver.loc_scope WHERE record_type='relation' AND child_scope_id=NEW.scope_id AND parent_scope_id<>NEW.parent_scope_id;
  IF NOT EXISTS(SELECT 1 FROM silver.loc_scope WHERE record_type='relation' AND parent_scope_id=NEW.parent_scope_id AND child_scope_id=NEW.scope_id) THEN
   INSERT INTO silver.loc_scope(record_type,scope_id,parent_scope_id,child_scope_id,relation_type,created_by,created_at,updated_at)
   VALUES('relation',NEW.scope_id,NEW.parent_scope_id,NEW.scope_id,coalesce(NEW.relation_type,'parent_child'),NEW.created_by,NEW.created_at,now());
  END IF;
 END IF;
 RETURN NEW;
END;
$function$;

-- MIGRATION STEP 45
CREATE OR REPLACE FUNCTION silver.log_scope_content_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'silver', 'api', 'public'
AS $function$ DECLARE old_row jsonb:=coalesce(to_jsonb(OLD),'{}'::jsonb); new_row jsonb:=coalesce(to_jsonb(NEW),'{}'::jsonb); item record; v_target_scope text; v_log_scope text; v_type text; v_id text; v_actor text; v_actor_name text; v_actor_email text; BEGIN v_actor:=api.current_scope_user_id(); SELECT u.name,u.email INTO v_actor_name,v_actor_email FROM neon_auth."user" u WHERE u.id::text=v_actor LIMIT 1; IF TG_TABLE_NAME='resource_visibility' THEN v_target_scope:=coalesce(old_row->>'scope',new_row->>'scope'); v_type:=coalesce(old_row->>'resource_type',new_row->>'resource_type'); v_id:=coalesce(old_row->>'resource_id',new_row->>'resource_id'); ELSE v_target_scope:=coalesce(old_row->>'scope_id',new_row->>'scope_id'); v_type:=CASE TG_TABLE_NAME WHEN 'lo3rwang_galaxy' THEN 'galaxy' WHEN 'lo3rwang_galaxy_media' THEN 'galaxy_media' ELSE TG_TABLE_NAME END; v_id:=CASE TG_TABLE_NAME WHEN 'lo3rwang_galaxy' THEN coalesce(old_row->>'galaxy_id',new_row->>'galaxy_id') WHEN 'lo3rwang_galaxy_media' THEN coalesce(old_row->>'media_id',new_row->>'media_id') ELSE NULL END; END IF; v_log_scope:=CASE WHEN api.has_scope_access('admin',ARRAY['scope_manager','global_admin']::text[]) THEN 'admin' ELSE v_target_scope END; FOR item IN SELECT key,value FROM jsonb_each(old_row) LOOP IF item.value IS DISTINCT FROM new_row->item.key THEN INSERT INTO silver.loc_scope(record_type,scope_id,target_scope_id,resource_type,resource_id,actor_id,actor_name,actor_email,field_name,old_value,new_value) VALUES('content_audit',v_log_scope,v_target_scope,v_type,v_id,v_actor,v_actor_name,v_actor_email,item.key,item.value #>> '{}',new_row->item.key #>> '{}'); END IF; END LOOP; IF TG_OP='INSERT' THEN FOR item IN SELECT key,value FROM jsonb_each(new_row) LOOP INSERT INTO silver.loc_scope(record_type,scope_id,target_scope_id,resource_type,resource_id,actor_id,actor_name,actor_email,field_name,old_value,new_value) VALUES('content_audit',v_log_scope,v_target_scope,v_type,v_id,v_actor,v_actor_name,v_actor_email,item.key,NULL,item.value #>> '{}'); END LOOP; END IF; RETURN NEW; END; $function$;

-- MIGRATION STEP 46
CREATE UNIQUE INDEX loc_scope_scope_id_uq ON silver.loc_scope USING btree (scope_id) WHERE (record_type = 'scope'::text);

-- MIGRATION STEP 47
CREATE UNIQUE INDEX loc_scope_legacy_id_uq ON silver.loc_scope USING btree (legacy_scope_id) WHERE ((record_type = 'scope'::text) AND (legacy_scope_id IS NOT NULL));

-- MIGRATION STEP 48
CREATE UNIQUE INDEX loc_scope_relation_uq ON silver.loc_scope USING btree (parent_scope_id, child_scope_id) WHERE (record_type = 'relation'::text);

-- MIGRATION STEP 49
CREATE UNIQUE INDEX loc_scope_grant_uq ON silver.loc_scope USING btree (user_id, scope_id, access_level, case_id) WHERE (record_type = 'access_grant'::text);

-- MIGRATION STEP 50
CREATE UNIQUE INDEX loc_scope_affiliation_uq ON silver.loc_scope USING btree (work_id, scope_id) WHERE (record_type = 'work_affiliation'::text);

-- MIGRATION STEP 51
CREATE INDEX loc_scope_order_idx ON silver.loc_scope USING btree (display_order, scope_id) WHERE (record_type = 'scope'::text);

-- MIGRATION STEP 52
CREATE INDEX loc_scope_requests_idx ON silver.loc_scope USING btree (status, created_at DESC) WHERE (record_type = 'relation_request'::text);

-- MIGRATION STEP 53
CREATE INDEX loc_scope_audit_idx ON silver.loc_scope USING btree (scope_id, resource_type, resource_id, changed_at DESC) WHERE (record_type = 'content_audit'::text);

-- MIGRATION STEP 54
CREATE TRIGGER loc_scope_record_guard BEFORE INSERT OR DELETE OR UPDATE ON silver.loc_scope FOR EACH ROW EXECUTE FUNCTION api.enforce_loc_scope_row();

-- MIGRATION STEP 55
CREATE TRIGGER loc_scope_parent_sync AFTER INSERT OR UPDATE OF parent_scope_id, scope_id ON silver.loc_scope FOR EACH ROW EXECUTE FUNCTION api.sync_loc_scope_parent_relation();

-- MIGRATION STEP 56
ALTER TABLE silver.loc_scope ENABLE ROW LEVEL SECURITY;

-- MIGRATION STEP 57
CREATE POLICY loc_scope_public_select ON silver.loc_scope FOR SELECT TO anonymous,authenticated USING ((((record_type = 'scope'::text) AND active) OR (record_type = ANY (ARRAY['relation'::text, 'work_affiliation'::text]))));

-- MIGRATION STEP 58
CREATE POLICY loc_scope_private_select ON silver.loc_scope FOR SELECT TO authenticated USING ((api.has_scope_access('admin'::text, ARRAY['scope_manager'::text]) OR ((record_type = 'scope'::text) AND api.has_scope_access(scope_id, ARRAY['scope_manager'::text])) OR ((record_type = 'relation_request'::text) AND ((requested_by = api.current_scope_user_id()) OR api.can_review_scope_relation(parent_scope_id, child_scope_id))) OR ((record_type = 'access_grant'::text) AND ((user_id = api.current_scope_user_id()) OR api.has_scope_access(scope_id, ARRAY['scope_manager'::text]))) OR ((record_type = 'content_audit'::text) AND api.can_manage_scope(scope_id))));

-- MIGRATION STEP 59
CREATE POLICY loc_scope_insert_scope ON silver.loc_scope FOR INSERT TO authenticated  WITH CHECK (((record_type = 'scope'::text) AND api.has_scope_access('admin'::text, ARRAY['scope_manager'::text])));

-- MIGRATION STEP 60
CREATE POLICY loc_scope_update_scope ON silver.loc_scope FOR UPDATE TO authenticated USING (((record_type = 'scope'::text) AND api.has_scope_access('admin'::text, ARRAY['scope_manager'::text]))) WITH CHECK (((record_type = 'scope'::text) AND api.has_scope_access('admin'::text, ARRAY['scope_manager'::text])));

-- MIGRATION STEP 61
CREATE POLICY loc_scope_delete_scope ON silver.loc_scope FOR DELETE TO authenticated USING (((record_type = 'scope'::text) AND api.has_scope_access('admin'::text, ARRAY['scope_manager'::text])));

-- MIGRATION STEP 62
CREATE POLICY loc_scope_affiliation_write ON silver.loc_scope  TO authenticated USING (((record_type = 'work_affiliation'::text) AND api.can_manage_scope(scope_id))) WITH CHECK (((record_type = 'work_affiliation'::text) AND api.can_manage_scope(scope_id)));

-- MIGRATION STEP 63
GRANT SELECT ON silver.loc_scope TO anonymous,authenticated;

-- MIGRATION STEP 64
GRANT INSERT,UPDATE,DELETE ON silver.loc_scope TO authenticated;

-- MIGRATION STEP 65
GRANT SELECT ON api.lo3rwang_work_affiliations TO anonymous,authenticated;

-- MIGRATION STEP 66
GRANT SELECT ON api.loc_work_affiliations TO anonymous,authenticated;

-- MIGRATION STEP 67
GRANT SELECT ON api.runes_work_affiliations TO anonymous,authenticated;

-- MIGRATION STEP 68
GRANT SELECT ON api.scope_access_grants TO authenticated;

-- MIGRATION STEP 69
GRANT SELECT ON api.scope_contacts TO anonymous,authenticated;

-- MIGRATION STEP 70
GRANT SELECT ON api.scope_relation_requests TO authenticated;

-- MIGRATION STEP 71
GRANT SELECT ON api.scope_relations TO anonymous,authenticated;

-- MIGRATION STEP 72
GRANT SELECT ON silver.loc_scope_registry TO anonymous,authenticated;

-- MIGRATION STEP 73
GRANT SELECT ON silver.scope_content_audit TO authenticated;

-- MIGRATION STEP 74
GRANT SELECT ON silver.work_scope_affiliations TO anonymous,authenticated;

-- MIGRATION STEP 75
DROP POLICY IF EXISTS user_records_privacy_handler_read ON api.user_records;

-- MIGRATION STEP 999
CREATE POLICY user_records_privacy_handler_read ON api.user_records FOR SELECT TO authenticated USING (scope_id=ANY(ARRAY['darklord','dlwang']::text[]) AND EXISTS (SELECT 1 FROM silver.loc_scope g WHERE g.record_type='access_grant' AND g.user_id=auth.user_id() AND g.scope_id=ANY(ARRAY['darklord','dlwang']::text[]) AND g.access_level='privacy_dispute_handler' AND (g.case_id IS NULL OR g.case_id=user_records.id)));

-- MIGRATION STEP 76
REVOKE ALL ON FUNCTION api.grant_scope_access(text,text,text,text) FROM PUBLIC;

-- MIGRATION STEP 77
GRANT EXECUTE ON FUNCTION api.grant_scope_access(text,text,text,text) TO authenticated;

-- MIGRATION STEP 78
REVOKE ALL ON FUNCTION api.revoke_scope_access(text,text,text,text) FROM PUBLIC;

-- MIGRATION STEP 79
GRANT EXECUTE ON FUNCTION api.revoke_scope_access(text,text,text,text) TO authenticated;

-- MIGRATION STEP 80
REVOKE ALL ON FUNCTION api.request_scope_relation(text,text,text,text) FROM PUBLIC;

-- MIGRATION STEP 81
GRANT EXECUTE ON FUNCTION api.request_scope_relation(text,text,text,text) TO authenticated;

-- MIGRATION STEP 82
REVOKE ALL ON FUNCTION api.decide_scope_relation_request(uuid,text,text,text) FROM PUBLIC;

-- MIGRATION STEP 83
GRANT EXECUTE ON FUNCTION api.decide_scope_relation_request(uuid,text,text,text) TO authenticated;

-- MIGRATION STEP 84
GRANT EXECUTE ON FUNCTION api.has_scope_access(text,text[]),api.can_manage_scope(text),api.can_manage_scope_page(text),api.can_review_scope_relation(text,text),api.current_scope_user_id() TO authenticated;
