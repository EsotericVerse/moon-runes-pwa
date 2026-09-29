-- Disposable runtime spool.
-- This is not a cache, not a content store, and never a Current data authority.
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
GRANT SELECT, INSERT, DELETE ON TABLE silver.spool TO anonymous;
