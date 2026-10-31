ALTER TABLE silver.loc
  ADD COLUMN IF NOT EXISTS cache text[] NOT NULL
  DEFAULT ARRAY['cache','','[]','{}']::text[];

DO $migration$
BEGIN
  IF to_regclass('silver.loc_runtime_config') IS NOT NULL THEN
    EXECUTE $copy$
      UPDATE silver.loc AS target
      SET cache = ARRAY[
        source.cache_mode,
        source.cache_provider,
        source.isr_domains::text,
        source.io_limits::text
      ]::text[]
      FROM silver.loc_runtime_config AS source
      WHERE target.id=source.id
        AND target.cache=ARRAY['cache','','[]','{}']::text[]
    $copy$;
  END IF;
END
$migration$;

ALTER TABLE silver.loc
  DROP COLUMN IF EXISTS cache_mode,
  DROP COLUMN IF EXISTS cache_provider,
  DROP COLUMN IF EXISTS isr_domains,
  DROP COLUMN IF EXISTS io_limits;

DROP TABLE IF EXISTS silver.loc_runtime_config RESTRICT;
DROP TABLE IF EXISTS silver.loc_search_keywords RESTRICT;
DROP TABLE IF EXISTS silver.loc_search_terms RESTRICT;
DROP TABLE IF EXISTS silver.loc_place RESTRICT;
DROP TABLE IF EXISTS silver.loc_trace RESTRICT;
