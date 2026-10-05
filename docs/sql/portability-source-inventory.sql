-- Run in the active PostgreSQL SQL editor. Read-only catalog inventory.
-- Export the single inventory JSON cell. No application content or passwords.
WITH relations AS (
  SELECT c.oid,n.nspname AS schema_name,c.relname,c.relkind,c.relrowsecurity,c.relforcerowsecurity,
    c.reloptions,pg_get_userbyid(c.relowner) AS owner
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname IN ('silver','api') AND c.relkind IN ('r','p','v','m','S')
), columns AS (
  SELECT r.schema_name,r.relname,a.attnum,a.attname,format_type(a.atttypid,a.atttypmod) AS type,
    a.attnotnull,a.attidentity,a.attgenerated,pg_get_expr(d.adbin,d.adrelid) AS default_expression,
    col_description(r.oid,a.attnum) AS comment
  FROM relations r JOIN pg_attribute a ON a.attrelid=r.oid
  LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
  WHERE a.attnum>0 AND NOT a.attisdropped
), constraints AS (
  SELECT r.schema_name,r.relname,c.conname,c.contype,c.convalidated,c.condeferrable,c.condeferred,
    pg_get_constraintdef(c.oid,true) AS definition
  FROM relations r JOIN pg_constraint c ON c.conrelid=r.oid
), indexes AS (
  SELECT i.schemaname,i.tablename,i.indexname,i.indexdef
  FROM pg_indexes i WHERE i.schemaname IN ('silver','api')
), functions AS (
  SELECT n.nspname AS schema_name,p.proname,pg_get_function_identity_arguments(p.oid) AS arguments,
    p.prokind,p.prosecdef,p.proconfig,p.proacl::text AS acl,
    pg_get_functiondef(p.oid) AS definition
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname IN ('silver','api') AND p.prokind IN ('f','p')
), triggers AS (
  SELECT r.schema_name,r.relname,t.tgname,pg_get_triggerdef(t.oid,true) AS definition,
    fn.nspname AS function_schema,p.proname AS function_name,pg_get_functiondef(p.oid) AS function_definition
  FROM relations r JOIN pg_trigger t ON t.tgrelid=r.oid AND NOT t.tgisinternal
  JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace fn ON fn.oid=p.pronamespace
), table_sizes AS (
  SELECT r.schema_name,r.relname,pg_total_relation_size(r.oid) AS total_bytes,
    pg_relation_size(r.oid) AS data_bytes,s.n_live_tup AS estimated_rows
  FROM relations r LEFT JOIN pg_stat_user_tables s ON s.relid=r.oid
  WHERE r.relkind IN ('r','p','m')
), views AS (
  SELECT r.schema_name,r.relname,r.reloptions,pg_get_viewdef(r.oid,true) AS definition
  FROM relations r WHERE r.relkind IN ('v','m')
), view_dependencies AS (
  SELECT DISTINCT r.schema_name,r.relname,n.nspname AS dependency_schema,c.relname AS dependency_relation
  FROM relations r JOIN pg_rewrite rw ON rw.ev_class=r.oid
  JOIN pg_depend d ON d.objid=rw.oid AND d.refclassid='pg_class'::regclass
  JOIN pg_class c ON c.oid=d.refobjid JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE r.relkind IN ('v','m') AND c.oid<>r.oid
)
SELECT jsonb_build_object(
  'database',current_database(),'version',version(),
  'schemas',(SELECT jsonb_agg(nspname ORDER BY nspname) FROM pg_namespace WHERE nspname !~ '^pg_' AND nspname<>'information_schema'),
  'relations',(SELECT jsonb_agg(to_jsonb(r) ORDER BY schema_name,relname) FROM relations r),
  'columns',(SELECT jsonb_agg(to_jsonb(c) ORDER BY schema_name,relname,attnum) FROM columns c),
  'constraints',(SELECT jsonb_agg(to_jsonb(c) ORDER BY schema_name,relname,conname) FROM constraints c),
  'indexes',(SELECT jsonb_agg(to_jsonb(i) ORDER BY schemaname,tablename,indexname) FROM indexes i),
  'functions',(SELECT jsonb_agg(to_jsonb(f) ORDER BY schema_name,proname,arguments) FROM functions f),
  'triggers',(SELECT jsonb_agg(to_jsonb(t) ORDER BY schema_name,relname,tgname) FROM triggers t),
  'table_sizes',(SELECT jsonb_agg(to_jsonb(s) ORDER BY schema_name,relname) FROM table_sizes s),
  'views',(SELECT jsonb_agg(to_jsonb(v) ORDER BY schema_name,relname) FROM views v),
  'view_dependencies',(SELECT jsonb_agg(to_jsonb(v) ORDER BY schema_name,relname,dependency_schema,dependency_relation) FROM view_dependencies v),
  'extensions',(SELECT jsonb_agg(jsonb_build_object('name',e.extname,'version',e.extversion,'schema',n.nspname) ORDER BY e.extname) FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace),
  'table_grants',(SELECT jsonb_agg(to_jsonb(g) ORDER BY table_schema,table_name,grantee,privilege_type) FROM information_schema.table_privileges g WHERE table_schema IN ('silver','api')),
  'column_grants',(SELECT jsonb_agg(to_jsonb(g) ORDER BY table_schema,table_name,column_name,grantee,privilege_type) FROM information_schema.column_privileges g WHERE table_schema IN ('silver','api'))
) AS inventory;
