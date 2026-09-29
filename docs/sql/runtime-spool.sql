-- Disposable runtime spool.
-- This is the only allowed transient DB work table.
-- It is not a cache, not a content store, and never a Current data authority.
-- Only short identifiers may be written here. Payload/content/media metadata are forbidden.

CREATE TABLE IF NOT EXISTS silver.spool (
  run_id uuid NOT NULL,
  scope_id varchar(24) NOT NULL,
  purpose varchar(16) NOT NULL,
  entity_type varchar(16) NOT NULL,
  entity_id varchar(64) NOT NULL,
  bucket varchar(32),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  CONSTRAINT spool_pk PRIMARY KEY (run_id,purpose,entity_type,entity_id),
  CONSTRAINT spool_scope_short CHECK (char_length(scope_id) BETWEEN 1 AND 24),
  CONSTRAINT spool_purpose CHECK (purpose IN ('search','timeline','statistics')),
  CONSTRAINT spool_entity_type CHECK (entity_type IN ('uid','media_id')),
  CONSTRAINT spool_entity_id_short CHECK (char_length(entity_id) BETWEEN 1 AND 64),
  CONSTRAINT spool_bucket_short CHECK (bucket IS NULL OR char_length(bucket) <= 32),
  CONSTRAINT spool_ttl CHECK (expires_at > created_at AND expires_at <= created_at + interval '30 minutes')
);

CREATE INDEX IF NOT EXISTS spool_expiry_idx ON silver.spool (expires_at);
CREATE INDEX IF NOT EXISTS spool_run_idx ON silver.spool (run_id,scope_id,purpose);

COMMENT ON TABLE silver.spool IS 'Disposable UID/media_id work spool. Never a canonical data source.';

REVOKE ALL ON TABLE silver.spool FROM anonymous;
GRANT SELECT, INSERT, DELETE ON TABLE silver.spool TO authenticated;

ALTER TABLE silver.spool ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS spool_scope_read ON silver.spool;
DROP POLICY IF EXISTS spool_scope_insert ON silver.spool;
DROP POLICY IF EXISTS spool_scope_delete ON silver.spool;

CREATE POLICY spool_scope_read ON silver.spool
  FOR SELECT TO authenticated
  USING (silver.can_manage_scope(scope_id));

CREATE POLICY spool_scope_insert ON silver.spool
  FOR INSERT TO authenticated
  WITH CHECK (silver.can_manage_scope(scope_id));

CREATE POLICY spool_scope_delete ON silver.spool
  FOR DELETE TO authenticated
  USING (silver.can_manage_scope(scope_id));

CREATE OR REPLACE FUNCTION silver.guard_spool_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO silver, public
AS $$
DECLARE
  run_count bigint;
  scope_count bigint;
BEGIN
  SELECT count(*) INTO run_count
  FROM silver.spool
  WHERE run_id=NEW.run_id AND expires_at>now();
  IF run_count >= 10000 THEN
    RAISE EXCEPTION 'spool run limit exceeded';
  END IF;

  SELECT count(*) INTO scope_count
  FROM silver.spool
  WHERE scope_id=NEW.scope_id AND expires_at>now();
  IF scope_count >= 20000 THEN
    RAISE EXCEPTION 'spool scope limit exceeded';
  END IF;

  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS spool_insert_guard ON silver.spool;
CREATE TRIGGER spool_insert_guard
BEFORE INSERT ON silver.spool
FOR EACH ROW EXECUTE FUNCTION silver.guard_spool_insert();
