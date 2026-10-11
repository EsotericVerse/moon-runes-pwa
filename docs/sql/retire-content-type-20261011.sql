ALTER POLICY lo3rwang_galaxy_public_read ON silver.lo3rwang_galaxy USING (searchable IS TRUE OR silver.can_manage_scope('lo3rwang'));
ALTER POLICY lrunes_galaxy_public_read ON silver.lrunes_galaxy USING (searchable IS TRUE OR silver.can_manage_scope('lrunes'));

ALTER TABLE silver.lo3rwang_galaxy DROP COLUMN IF EXISTS content_type;
ALTER TABLE silver.lrunes_galaxy DROP COLUMN IF EXISTS content_type;
DROP TABLE IF EXISTS silver.scope_content_types;
