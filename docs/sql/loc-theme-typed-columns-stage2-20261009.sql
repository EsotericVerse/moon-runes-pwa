-- Apply ONLY after the typed-column frontend is deployed and checked.
-- No JSONB remains in silver.loc_theme after this step.
ALTER TABLE silver.loc_theme DROP COLUMN IF EXISTS theme_attr;
