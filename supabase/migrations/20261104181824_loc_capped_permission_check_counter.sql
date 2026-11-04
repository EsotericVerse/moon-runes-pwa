-- Temporary diagnostics for actual LOC management permission checks.
-- One singleton row, no table/index/cron/logging; hard cap of 1000.
ALTER TABLE silver.lo3rwang
  ADD COLUMN IF NOT EXISTS "count" integer NOT NULL DEFAULT 0;
ALTER TABLE silver.lo3rwang
  ADD CONSTRAINT lo3rwang_permission_count_cap
  CHECK ("count" BETWEEN 0 AND 1000);
COMMENT ON COLUMN silver.lo3rwang."count" IS
  'Temporary LOC cold-permission-check counter, bounded at 1000; matching event UTC epoch milliseconds + context in status.permission_check_events.';
