-- Public read boundary for LOC / LunaRunes.
-- Public features must remain readable without an authenticated session.
-- Authentication is only required for management/user writes.
--
-- This file grants SELECT only. It does not grant INSERT/UPDATE/DELETE.

BEGIN;

GRANT USAGE ON SCHEMA silver TO anonymous;

GRANT SELECT ON TABLE
  silver.game,
  silver.lo3rwang,
  silver.lo3rwang_time,
  silver.lo3rwang_galaxy,
  silver.lo3rwang_galaxy_media,
  silver.lrunes,
  silver.lrunes_daily,
  silver.lrunes_time,
  silver.lrunes_galaxy,
  silver.lrunes_galaxy_media,
  silver.runes,
  silver.runes_etc,
  silver.runes_group
TO anonymous;

REVOKE SELECT ON TABLE silver.manage FROM anonymous;
GRANT SELECT (id, role, birthday, galaxy, time) ON silver.manage TO anonymous;

COMMIT;
