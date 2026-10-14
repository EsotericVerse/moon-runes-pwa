-- Preserve database target location / cloud region for SQL connection presets.
ALTER TABLE silver.database_targets ADD COLUMN IF NOT EXISTS region text NOT NULL DEFAULT '';
