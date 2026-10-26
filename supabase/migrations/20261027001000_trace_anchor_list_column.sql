-- Final Trace Queue column contract. Run after the coordinated four-digit
-- silver.*_trace.id cutover, before publishing clients that select anchor_list.
-- Historical migrations still reference anchor_uids because that was the
-- pre-cutover physical column; only this migration performs its renaming.
-- Rename is metadata-only: it does not rewrite, delete or reorder the array.
BEGIN;
SET LOCAL lock_timeout='8s';
SET LOCAL statement_timeout='45s';

DO $guard$
DECLARE unexpected text;
BEGIN
 IF EXISTS (
   SELECT 1 FROM information_schema.columns
   WHERE table_schema='silver'
     AND table_name IN ('lo3rwang_trace','lrunes_trace','loc_trace')
     AND column_name='anchor_list'
 ) THEN
   RAISE EXCEPTION 'anchor_list exists before migration: inspect schema drift';
 END IF;
 IF (
   SELECT count(*) FROM information_schema.columns
   WHERE table_schema='silver'
     AND table_name IN ('lo3rwang_trace','lrunes_trace','loc_trace')
     AND column_name='anchor_uids' AND udt_name='_text' AND is_nullable='NO'
 ) <> 3 THEN
   RAISE EXCEPTION 'Expected exactly three non-nullable text[] Trace Queues';
 END IF;
 SELECT string_agg(n.nspname||'.'||p.proname,', ')
 INTO unexpected
 FROM pg_proc p
 JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE p.prosrc LIKE '%anchor_uids%'
   AND n.nspname NOT IN ('pg_catalog','information_schema')
   AND NOT (
     n.nspname='silver'
     AND p.proname IN (
       'validate_scoped_trace_map',
       'protect_scoped_trace_anchor',
       'sync_scope_trace_union',
       'trace_popular_anchors',
       'merge_scoped_trace_anchors',
       'merge_scope_trace_place_names'
     )
   );
 IF unexpected IS NOT NULL THEN
   RAISE EXCEPTION 'Unreviewed Queue dependent functions: %', unexpected;
 END IF;
END
$guard$;

LOCK TABLE silver.lo3rwang_trace, silver.lrunes_trace, silver.loc_trace
 IN ACCESS EXCLUSIVE MODE;

-- PostgreSQL RENAME COLUMN preserves the existing NOT NULL, '{}' default,
-- the array element order, policies, grants, indexes and stored rows.
ALTER TABLE silver.lo3rwang_trace RENAME COLUMN anchor_uids TO anchor_list;
ALTER TABLE silver.lrunes_trace RENAME COLUMN anchor_uids TO anchor_list;
ALTER TABLE silver.loc_trace RENAME COLUMN anchor_uids TO anchor_list;

-- Stored PL/pgSQL sources and dynamic SQL are not rewritten just because a
-- table column was renamed. Rebuild the complete existing function body,
-- preserving the original SQL security context and signatures.
DO $rewrite$
DECLARE routine record;
DECLARE old_definition text;
DECLARE count_changed integer := 0;
BEGIN
 FOR routine IN
   SELECT p.oid,p.proname
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='silver' AND p.prosrc LIKE '%anchor_uids%'
   ORDER BY p.proname,p.oid
 LOOP
   old_definition := pg_get_functiondef(routine.oid);
   IF old_definition IS NULL OR position('anchor_uids' in old_definition)=0 THEN
     RAISE EXCEPTION 'Could not reconstruct SQL function %',routine.proname;
   END IF;
   EXECUTE replace(old_definition,'anchor_uids','anchor_list');
   count_changed:=count_changed+1;
 END LOOP;
 IF count_changed<4 THEN
   RAISE EXCEPTION 'Expected Trace Queue trigger/RPC dependents, got %',count_changed;
 END IF;
END
$rewrite$;

COMMENT ON COLUMN silver.lo3rwang_trace.anchor_list
 IS 'Ordered list of this Scope spatial anchor Trace.id values; no duplicate identity column.';
COMMENT ON COLUMN silver.lrunes_trace.anchor_list
 IS 'Ordered list of this Scope spatial anchor Trace.id values; no duplicate identity column.';
COMMENT ON COLUMN silver.loc_trace.anchor_list
 IS 'Ordered list of spatial anchor Trace.id values within the specified Scope.';

DO $verify$
BEGIN
 IF (
   SELECT count(*) FROM information_schema.columns
   WHERE table_schema='silver'
   AND table_name IN ('lo3rwang_trace','lrunes_trace','loc_trace')
   AND column_name='anchor_list' AND udt_name='_text' AND is_nullable='NO'
 )<>3 THEN
   RAISE EXCEPTION 'Trace anchor_list column contract missing after rename';
 END IF;
 IF EXISTS (
   SELECT 1 FROM information_schema.columns
   WHERE table_schema='silver'
   AND table_name IN ('lo3rwang_trace','lrunes_trace','loc_trace')
   AND column_name='anchor_uids'
 ) OR EXISTS (
   SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='silver' AND p.prosrc LIKE '%anchor_uids%'
 ) THEN
   RAISE EXCEPTION 'Legacy Trace Queue field still referenced';
 END IF;
END
$verify$;
COMMIT;
