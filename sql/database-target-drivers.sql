-- Extend the existing Admin target registry without replacing its RLS or credentials model.
-- Server-side secrets are NEVER stored in this table: connection_alias is an opaque key.
BEGIN;
ALTER TABLE silver.database_targets
  ADD COLUMN IF NOT EXISTS engine text NOT NULL DEFAULT 'postgres',
  ADD COLUMN IF NOT EXISTS connection_alias text,
  ADD COLUMN IF NOT EXISTS connection_mode text NOT NULL DEFAULT 'direct';
ALTER TABLE silver.database_targets DROP CONSTRAINT IF EXISTS database_targets_provider_check;
ALTER TABLE silver.database_targets ADD CONSTRAINT database_targets_provider_check
  CHECK (provider IN ('supabase','neon','custom'));
ALTER TABLE silver.database_targets
  ADD CONSTRAINT database_targets_engine_check CHECK (engine IN ('postgres','mysql','mssql','sqlite')),
  ADD CONSTRAINT database_targets_provider_engine_check CHECK (provider='custom' OR engine='postgres'),
  ADD CONSTRAINT database_targets_mode_check CHECK (connection_mode IN ('direct','pooler')),
  ADD CONSTRAINT database_targets_alias_check CHECK (connection_alias IS NULL OR connection_alias ~ '^[a-z][a-z0-9_]{0,63}$');
UPDATE silver.database_targets SET connection_alias=CASE provider
  WHEN 'supabase' THEN 'supabase_current' WHEN 'neon' THEN 'neon_current'
  ELSE connection_alias END,
  connection_mode=CASE WHEN provider='supabase' THEN 'pooler' ELSE 'direct' END
WHERE connection_alias IS NULL;
COMMIT;
