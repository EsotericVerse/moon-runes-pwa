-- Defer LOC spatial aggregation until both owner Scope sources are reviewed.
-- This migration mirrors the manual production cutover already completed.
-- It deliberately does not use CASCADE or modify owner Scope records.
BEGIN;
SET LOCAL lock_timeout = '10s';
DROP TRIGGER IF EXISTS lo3rwang_trace_union_sync ON silver.lo3rwang_trace;
DROP TRIGGER IF EXISTS lrunes_trace_union_sync ON silver.lrunes_trace;
DROP FUNCTION IF EXISTS silver.sync_scope_trace_union();
DROP TABLE IF EXISTS silver.loc_trace;
COMMIT;
