-- LOC Galaxy BOOLEAN cutover. Non-destructive expand, preserving existing flags.
-- The final `DROP COLUMN able` is deliberately manual after production client verification.
ALTER TABLE silver.lrunes_galaxy ADD COLUMN IF NOT EXISTS "statics" boolean;
ALTER TABLE silver.lrunes_galaxy ADD COLUMN IF NOT EXISTS "culture" boolean;
ALTER TABLE silver.lrunes_galaxy ADD COLUMN IF NOT EXISTS "search" boolean;
ALTER TABLE silver.lrunes_galaxy ADD COLUMN IF NOT EXISTS "trace" boolean;
ALTER TABLE silver.lrunes_galaxy ADD COLUMN IF NOT EXISTS "list" boolean;
ALTER TABLE silver.lrunes_galaxy ADD COLUMN IF NOT EXISTS "keyword" boolean;
ALTER TABLE silver.lrunes_galaxy ADD COLUMN IF NOT EXISTS "others" boolean;
ALTER TABLE silver.lrunes_galaxy ADD COLUMN IF NOT EXISTS "extract" boolean;
UPDATE silver.lrunes_galaxy SET
  "statics"=COALESCE("statics",(able->>'statics')::boolean,TRUE),
  "culture"=COALESCE("culture",(able->>'culture')::boolean,TRUE),
  "search"=COALESCE("search",(able->>'search')::boolean,TRUE),
  "trace"=COALESCE("trace",(able->>'trace')::boolean,TRUE),
  "list"=COALESCE("list",(able->>'list')::boolean,TRUE),
  "keyword"=COALESCE("keyword",(able->>'keywords')::boolean,TRUE),
  "others"=COALESCE("others",(able->>'game')::boolean,TRUE),
  "extract"=COALESCE("extract",(able->>'extract')::boolean,TRUE)
WHERE "statics" IS NULL OR "culture" IS NULL OR "search" IS NULL OR "trace" IS NULL OR "list" IS NULL OR "keyword" IS NULL OR "others" IS NULL OR "extract" IS NULL;
UPDATE silver.lo3rwang_galaxy SET
  "statics"=COALESCE("statics",(able->>'statics')::boolean,TRUE),
  "culture"=COALESCE("culture",(able->>'culture')::boolean,TRUE),
  "search"=COALESCE("search",(able->>'search')::boolean,TRUE),
  "trace"=COALESCE("trace",(able->>'trace')::boolean,TRUE),
  "list"=COALESCE("list",(able->>'list')::boolean,TRUE),
  "keyword"=COALESCE("keyword",(able->>'keywords')::boolean,TRUE),
  "others"=COALESCE("others",(able->>'game')::boolean,TRUE),
  "extract"=COALESCE("extract",(able->>'extract')::boolean,TRUE)
WHERE "statics" IS NULL OR "culture" IS NULL OR "search" IS NULL OR "trace" IS NULL OR "list" IS NULL OR "keyword" IS NULL OR "others" IS NULL OR "extract" IS NULL;

-- Preserve the previous all-true Galaxy default; import and MCP writers provide
-- explicit FALSE where visibility must be denied. No NULL is a valid feature flag.
ALTER TABLE silver.lo3rwang_galaxy
  ALTER COLUMN "statics" SET DEFAULT TRUE,
  ALTER COLUMN "statics" SET NOT NULL,
  ALTER COLUMN "culture" SET DEFAULT TRUE,
  ALTER COLUMN "culture" SET NOT NULL,
  ALTER COLUMN "search" SET DEFAULT TRUE,
  ALTER COLUMN "search" SET NOT NULL,
  ALTER COLUMN "trace" SET DEFAULT TRUE,
  ALTER COLUMN "trace" SET NOT NULL,
  ALTER COLUMN "list" SET DEFAULT TRUE,
  ALTER COLUMN "list" SET NOT NULL,
  ALTER COLUMN "keyword" SET DEFAULT TRUE,
  ALTER COLUMN "keyword" SET NOT NULL,
  ALTER COLUMN "others" SET DEFAULT TRUE,
  ALTER COLUMN "others" SET NOT NULL,
  ALTER COLUMN "extract" SET DEFAULT TRUE,
  ALTER COLUMN "extract" SET NOT NULL;

ALTER TABLE silver.lrunes_galaxy
  ALTER COLUMN "statics" SET DEFAULT TRUE,
  ALTER COLUMN "statics" SET NOT NULL,
  ALTER COLUMN "culture" SET DEFAULT TRUE,
  ALTER COLUMN "culture" SET NOT NULL,
  ALTER COLUMN "search" SET DEFAULT TRUE,
  ALTER COLUMN "search" SET NOT NULL,
  ALTER COLUMN "trace" SET DEFAULT TRUE,
  ALTER COLUMN "trace" SET NOT NULL,
  ALTER COLUMN "list" SET DEFAULT TRUE,
  ALTER COLUMN "list" SET NOT NULL,
  ALTER COLUMN "keyword" SET DEFAULT TRUE,
  ALTER COLUMN "keyword" SET NOT NULL,
  ALTER COLUMN "others" SET DEFAULT TRUE,
  ALTER COLUMN "others" SET NOT NULL,
  ALTER COLUMN "extract" SET DEFAULT TRUE,
  ALTER COLUMN "extract" SET NOT NULL;

-- Patch the CURRENT function definitions in-place, rather than restoring an
-- old snapshot while concurrent RPC consolidation is underway.
DO $galaxy_cutover$
DECLARE
  fn record;
  mapping record;
  ddl text;
  before_ddl text;
BEGIN
  FOR fn IN
    SELECT p.oid,p.proname FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='silver' AND p.prokind='f'
      AND p.prosrc LIKE '%able->>%'
  LOOP
    ddl:=pg_get_functiondef(fn.oid);
    before_ddl:=ddl;
    FOR mapping IN SELECT * FROM (VALUES
      ('statics','statics'),('culture','culture'),('search','search'),
      ('trace','trace'),('list','list'),('keywords','keyword'),
      ('game','others'),('extract','extract')
    ) AS v(old_key,new_column)
    LOOP
      ddl:=replace(ddl,'able->>'||chr(39)||mapping.old_key||chr(39),mapping.new_column);
      ddl:=replace(ddl,'able->>'||repeat(chr(39),2)||mapping.old_key||
        repeat(chr(39),2),mapping.new_column);
    END LOOP;
    IF ddl=before_ddl OR position('able->>' IN ddl)>0 THEN
      RAISE EXCEPTION 'Galaxy boolean RPC conversion incomplete: %',fn.proname;
    END IF;
    EXECUTE ddl;
  END LOOP;

  -- Existing Galaxy content-validity trigger must update native BOOLEANs.
  FOR fn IN
    SELECT p.oid,p.proname FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='silver' AND p.proname='normalize_galaxy_content_validity'
      AND p.prosrc LIKE '%NEW.able%'
  LOOP
    ddl:=pg_get_functiondef(fn.oid);
    ddl:=replace(ddl,
      $old$NEW.able:=COALESCE(NEW.able,'{}'::jsonb)||'{"search":false,"list":false}'::jsonb;$old$,
      $new$NEW.search:=false; NEW."list":=false;$new$);
    ddl:=replace(ddl,
      $old$NEW.able:=COALESCE(NEW.able,'{}'::jsonb)||'{"list":false}'::jsonb;$old$,
      $new$NEW."list":=false;$new$);
    IF position('NEW.able' IN ddl)>0 THEN
      RAISE EXCEPTION 'Galaxy trigger still references the retired able column';
    END IF;
    EXECUTE ddl;
  END LOOP;
END $galaxy_cutover$;

-- Retain the EXACT current public/management RLS conditions; change only
-- their Galaxy search predicate so no authorisation clause is lost.
DO $galaxy_rls$
DECLARE policy record; next_qual text;
BEGIN
  FOR policy IN
    SELECT schemaname,tablename,policyname,qual
    FROM pg_policies
    WHERE schemaname='silver'
      AND tablename IN ('lo3rwang_galaxy','lrunes_galaxy')
      AND cmd='SELECT' AND qual LIKE '%able%'
  LOOP
    next_qual:=replace(policy.qual,$old$able ->> 'search'::text$old$,'search');
    IF next_qual=policy.qual OR next_qual LIKE '%able%' THEN
      RAISE EXCEPTION 'Unsupported Galaxy RLS expression on %',policy.policyname;
    END IF;
    EXECUTE format('ALTER POLICY %I ON %I.%I USING (%s)',
      policy.policyname,policy.schemaname,policy.tablename,next_qual);
  END LOOP;
END $galaxy_rls$;

-- Retarget the two existing triggers without changing their stored function.
DO $galaxy_triggers$
DECLARE scopeid text; trigger_name text; old_definition text;
BEGIN
  FOREACH scopeid IN ARRAY ARRAY['lo3rwang','lrunes'] LOOP
    trigger_name:=scopeid||'_galaxy_content_validity';
    SELECT pg_get_triggerdef(t.oid) INTO old_definition
    FROM pg_trigger t
    WHERE t.tgrelid=to_regclass(format('silver.%I',scopeid||'_galaxy'))
      AND t.tgname=trigger_name AND NOT t.tgisinternal;
    IF old_definition IS NULL THEN
      RAISE EXCEPTION 'Expected Galaxy content trigger missing: %',trigger_name;
    END IF;
    IF old_definition LIKE '%UPDATE OF content, able, site%' THEN
      EXECUTE format('DROP TRIGGER %I ON silver.%I',trigger_name,scopeid||'_galaxy');
      EXECUTE format('CREATE TRIGGER %I BEFORE INSERT OR UPDATE OF content, search, "list", site ON silver.%I FOR EACH ROW EXECUTE FUNCTION silver.normalize_galaxy_content_validity()',
        trigger_name,scopeid||'_galaxy');
    ELSIF old_definition NOT LIKE '%UPDATE OF content, search, "list", site%' THEN
      RAISE EXCEPTION 'Unexpected Galaxy trigger definition: %',trigger_name;
    END IF;
  END LOOP;
END $galaxy_triggers$;
