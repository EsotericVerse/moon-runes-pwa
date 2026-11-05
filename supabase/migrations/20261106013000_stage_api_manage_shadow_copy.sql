-- Stage 1 / expand: add a live-readable copy before changing any client/RPC.
-- Do NOT drop, rename, block or restrict silver.manage here.
-- No Supabase/Neon database is removed; no existing RLS/GRANT is changed.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
CREATE TABLE api.manage (LIKE silver.manage INCLUDING ALL);
INSERT INTO api.manage SELECT * FROM silver.manage;
ALTER TABLE api.manage
  ADD CONSTRAINT manage_parent_scope_id_fkey
  FOREIGN KEY (parent_scope_id) REFERENCES api.manage(id);
ALTER TABLE api.manage ENABLE ROW LEVEL SECURITY;
CREATE POLICY manage_public_select ON api.manage FOR SELECT TO PUBLIC USING (true);
CREATE POLICY manage_admin_write ON api.manage FOR UPDATE TO authenticated
  USING (coalesce((SELECT allowed FROM silver.manage('global')),false));
GRANT USAGE ON SCHEMA api TO anon, anonymous, authenticated;
GRANT SELECT ON api.manage TO anon, anonymous, authenticated;
GRANT UPDATE ON api.manage TO authenticated;
DO $verify$
DECLARE source_count integer; dest_count integer;
BEGIN
  SELECT count(*) INTO source_count FROM silver.manage;
  SELECT count(*) INTO dest_count FROM api.manage;
  IF source_count <> dest_count OR
     EXISTS (SELECT * FROM silver.manage EXCEPT SELECT * FROM api.manage) OR
     EXISTS (SELECT * FROM api.manage EXCEPT SELECT * FROM silver.manage)
  THEN RAISE EXCEPTION 'api.manage shadow copy failed verification'; END IF;
END $verify$;
COMMIT;
