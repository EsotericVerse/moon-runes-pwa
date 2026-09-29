-- Optional Neon adapter for the UID spool contract.
-- Core LOC code must not depend on Neon-specific quotas or storage limits.
-- Other deployments may replace this adapter with local DB / TEMP TABLE / CTE / queue implementations.
-- The spool carries Galaxy UID only; no title/content/url/meta/media payload is allowed.

CREATE TABLE IF NOT EXISTS silver.spool (
  run_id uuid NOT NULL,
  scope_id varchar(24) NOT NULL,
  purpose varchar(16) NOT NULL,
  uid char(8) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  CONSTRAINT spool_pk PRIMARY KEY (run_id,purpose,uid),
  CONSTRAINT spool_scope_short CHECK (char_length(scope_id) BETWEEN 1 AND 24),
  CONSTRAINT spool_purpose CHECK (purpose IN ('search','timeline','statistics')),
  CONSTRAINT spool_uid_format CHECK (uid ~ '^[A-F0-9]{8}$'),
  CONSTRAINT spool_ttl CHECK (expires_at > created_at AND expires_at <= created_at + interval '30 minutes')
);

CREATE INDEX IF NOT EXISTS spool_expiry_idx ON silver.spool (expires_at);
CREATE INDEX IF NOT EXISTS spool_run_idx ON silver.spool (run_id,scope_id,purpose);

COMMENT ON TABLE silver.spool IS 'Optional disposable Galaxy UID spool adapter. Never a canonical data source.';

-- Public collaboration may use the UID-only spool.
-- Usage volume is governed by Neon/service limits rather than LOC-specific quotas.
GRANT SELECT, INSERT, DELETE ON TABLE silver.spool TO anonymous, authenticated;
REVOKE UPDATE, TRUNCATE ON TABLE silver.spool FROM anonymous, authenticated;

ALTER TABLE silver.spool ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS spool_public_read ON silver.spool;
DROP POLICY IF EXISTS spool_public_insert ON silver.spool;
DROP POLICY IF EXISTS spool_public_delete ON silver.spool;
DROP POLICY IF EXISTS spool_scope_read ON silver.spool;
DROP POLICY IF EXISTS spool_scope_insert ON silver.spool;
DROP POLICY IF EXISTS spool_scope_delete ON silver.spool;

CREATE POLICY spool_public_read ON silver.spool
  FOR SELECT TO anonymous, authenticated
  USING (expires_at > now());

CREATE POLICY spool_public_insert ON silver.spool
  FOR INSERT TO anonymous, authenticated
  WITH CHECK (expires_at > created_at AND expires_at <= created_at + interval '30 minutes');

CREATE POLICY spool_public_delete ON silver.spool
  FOR DELETE TO anonymous, authenticated
  USING (expires_at > now());
