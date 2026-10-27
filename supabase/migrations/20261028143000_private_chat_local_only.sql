-- Do not accept private conversation archive sources into any online Galaxy.
-- NOT VALID protects all new writes without changing or deleting existing works.
DO $$
DECLARE
  scope_row record;
  target regclass;
  blocked text[] := ARRAY[
    'messenger','chatgpt','claude','gemini','msn','whatsapp','telegram',
    'discord','line','wechat','teams','copilot','grok','perplexity',
    'meta ai','meta-ai'
  ];
BEGIN
  FOR scope_row IN
    SELECT id,coalesce(nullif(galaxy_table,''),'galaxy') AS table_suffix
    FROM silver.manage
    WHERE id ~ '^[a-z][a-z0-9]{0,14}$'
      AND id <> 'local'
  LOOP
    target := to_regclass(format('silver.%I',scope_row.id||'_'||scope_row.table_suffix));
    IF target IS NULL OR NOT EXISTS (
      SELECT 1 FROM pg_attribute
      WHERE attrelid=target AND attname='source_name' AND attnum>0 AND NOT attisdropped
    ) THEN CONTINUE; END IF;
    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid=target AND conname='galaxy_private_archive_local_only'
    ) THEN CONTINUE; END IF;
    EXECUTE format(
      'ALTER TABLE %s ADD CONSTRAINT galaxy_private_archive_local_only
       CHECK (lower(btrim(coalesce(source_name, ''''))) <> ALL (%L::text[])) NOT VALID',
      target,blocked
    );
  END LOOP;
END $$;