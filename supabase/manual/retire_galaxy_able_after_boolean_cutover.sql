-- Final destructive step. Execute ONLY after:
-- 1. Cloudflare Pages / Authority / loc-kysely have all deployed boolean-column code.
-- 2. Full syntax and integration tests pass.
-- 3. Public / authenticated article search, imports, editor writes and MCP sync
--    have been checked against both lo3rwang_galaxy and lrunes_galaxy.
-- 4. A recoverable database backup exists. No CASCADE is permitted.
DO $retire_able$
DECLARE target text; relation regclass; col_no smallint; missing bigint; dependencies bigint;
BEGIN
  FOREACH target IN ARRAY ARRAY['lo3rwang_galaxy','lrunes_galaxy'] LOOP
    relation:=to_regclass(format('silver.%I',target));
    IF relation IS NULL THEN RAISE EXCEPTION 'Missing Galaxy: %',target; END IF;
    SELECT attnum INTO col_no FROM pg_attribute
      WHERE attrelid=relation AND attname='able' AND NOT attisdropped;
    IF col_no IS NULL THEN CONTINUE; END IF;
    EXECUTE format('SELECT count(*) FROM %s WHERE statics IS NULL OR culture IS NULL OR search IS NULL OR trace IS NULL OR "list" IS NULL OR keyword IS NULL OR others IS NULL OR extract IS NULL',relation)
      INTO missing;
    IF missing>0 THEN
      RAISE EXCEPTION '% has % rows with incomplete boolean flags',target,missing;
    END IF;
    SELECT count(*) INTO dependencies
    FROM pg_depend d WHERE d.refobjid=relation AND d.refobjsubid=col_no
      AND NOT (d.classid='pg_attrdef'::regclass AND d.deptype='a');
    IF dependencies>0 THEN
      RAISE EXCEPTION '% still has % objects depending on able',target,dependencies;
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname IN ('silver','api') AND
      (p.prosrc LIKE '%able->>%' OR p.prosrc LIKE '%NEW.able%')) THEN
    RAISE EXCEPTION 'RPC or trigger function still references article able';
  END IF;
END $retire_able$;

ALTER TABLE silver.lo3rwang_galaxy DROP COLUMN IF EXISTS able;
ALTER TABLE silver.lrunes_galaxy DROP COLUMN IF EXISTS able;
