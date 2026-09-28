-- Public read boundary for LOC / LunaRunes.
-- Public features must remain readable without Neon Auth.
-- Authentication is only required for management/user writes.
--
-- Neon Data API:
--   db_anon_role = anonymous
--   exposed schemas include silver
--
-- This file grants SELECT only. It does not grant INSERT/UPDATE/DELETE.

BEGIN;

GRANT USAGE ON SCHEMA silver TO anonymous;

GRANT SELECT ON TABLE
  silver.faq_entries,
  silver.lo3rwang_style,
  silver.lo3rwang_time,
  silver.lrunes_time,
  silver.lo3rwang_galaxy,
  silver.lo3rwang_galaxy_media,
  silver.lrunes
TO anonymous;

-- silver.manage contains permission mapping data. Public scope discovery may read
-- only the non-personal id/role columns; email must not be exposed anonymously.
REVOKE SELECT ON TABLE silver.manage FROM anonymous;
GRANT SELECT (id, role) ON silver.manage TO anonymous;

COMMIT;
