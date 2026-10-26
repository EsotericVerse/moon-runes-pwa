-- Retire the unused legacy migration marker on lo3rwang Time only.
-- App query projections must be merged before applying this migration.
-- Keep every Time row, UID, anchor, event, Period, and other Scope unchanged.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $$
BEGIN
  IF to_regclass('silver.lo3rwang_time') IS NULL THEN
    RAISE EXCEPTION 'silver.lo3rwang_time is missing';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='silver' AND table_name='lo3rwang_time'
      AND column_name='status'
  ) THEN
    ALTER TABLE silver.lo3rwang_time DROP COLUMN status;
  END IF;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
