-- Table-name-only change: preserve all target rows, columns, RLS, grants and routing behavior.
-- The current root Scope Group is LOC, but its ID is read from silver.manage.
BEGIN;
SET LOCAL lock_timeout='8s';
SET LOCAL statement_timeout='60s';

DO $rename$
DECLARE
  groups text[];
  scope_group text;
  target_name text;
BEGIN
  SELECT array_agg(id ORDER BY id) INTO groups
  FROM silver.manage
  WHERE manage_role='group' AND active IS TRUE AND parent_scope_id IS NULL;
  IF cardinality(groups) IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'Expected exactly one active root Scope Group; got %', groups;
  END IF;
  scope_group:=groups[1];
  IF scope_group !~ '^[a-z][a-z0-9]{0,14}$' THEN
    RAISE EXCEPTION 'Invalid Scope Group ID: %',scope_group;
  END IF;
  target_name:=scope_group||'_dblists';
  IF to_regclass('silver.database_targets') IS NULL
     OR to_regclass(format('silver.%I',target_name)) IS NOT NULL THEN
    RAISE EXCEPTION 'Unexpected database list table state for %',target_name;
  END IF;
  EXECUTE format('ALTER TABLE silver.database_targets RENAME TO %I',target_name);
END $rename$;

-- The existing public routing-state RPC remains stable with unchanged output.
-- Only its underlying relation name is resolved from the same group registry.
CREATE OR REPLACE FUNCTION silver.loc_public_routing_state()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $routing$
DECLARE
  groups text[];
  scope_group text;
  list_name text;
  result jsonb;
BEGIN
  SELECT array_agg(id ORDER BY id) INTO groups
  FROM silver.manage
  WHERE manage_role='group' AND active IS TRUE AND parent_scope_id IS NULL;
  IF cardinality(groups) IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'Expected exactly one active root Scope Group';
  END IF;
  scope_group:=groups[1];
  IF scope_group !~ '^[a-z][a-z0-9]{0,14}$' THEN
    RAISE EXCEPTION 'Invalid Scope Group ID';
  END IF;
  list_name:=scope_group||'_dblists';
  EXECUTE format($sql$
    WITH chosen AS (
      SELECT target_id,provider,connection_alias,project_url,routing_mode
      FROM silver.%I WHERE selected IS TRUE LIMIT 1
    ), secondary AS (
      SELECT target_id,provider FROM silver.%I
      WHERE backup_selected IS TRUE LIMIT 1
    )
    SELECT pg_catalog.jsonb_build_object(
      'provider',COALESCE((SELECT provider FROM chosen),'supabase'),
      'primary_id',COALESCE((SELECT target_id FROM chosen),'supabase-current'),
      'primary_control',COALESCE((
        SELECT provider='supabase' AND connection_alias='supabase_current'
          AND project_url='https://qlouywsdiiyiyzpoxyqy.supabase.co' FROM chosen
      ),TRUE),
      'backup_id',(SELECT target_id FROM secondary),
      'backup_provider',(SELECT provider FROM secondary),
      'mode',COALESCE((SELECT routing_mode FROM chosen),'single')
    )
  $sql$,list_name,list_name) INTO result;
  RETURN result;
END $routing$;

NOTIFY pgrst,'reload schema';
COMMIT;
