ALTER POLICY lo3rwang_galaxy_public_read ON silver.lo3rwang_galaxy TO anonymous USING (searchable IS TRUE);
ALTER POLICY lrunes_galaxy_public_read ON silver.lrunes_galaxy TO anonymous USING (searchable IS TRUE);

DO $policies$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='silver' AND tablename='lo3rwang_galaxy' AND policyname='lo3rwang_galaxy_authenticated_read') THEN
    CREATE POLICY lo3rwang_galaxy_authenticated_read ON silver.lo3rwang_galaxy
      FOR SELECT TO authenticated USING (searchable IS TRUE OR silver.can_manage_scope('lo3rwang'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='silver' AND tablename='lrunes_galaxy' AND policyname='lrunes_galaxy_authenticated_read') THEN
    CREATE POLICY lrunes_galaxy_authenticated_read ON silver.lrunes_galaxy
      FOR SELECT TO authenticated USING (searchable IS TRUE OR silver.can_manage_scope('lrunes'));
  END IF;
END $policies$;

ALTER TABLE silver.lo3rwang_galaxy DROP COLUMN IF EXISTS content_type;
ALTER TABLE silver.lrunes_galaxy DROP COLUMN IF EXISTS content_type;
DROP TABLE IF EXISTS silver.scope_content_types;
