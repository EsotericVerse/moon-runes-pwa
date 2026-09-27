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
  silver.lo3rwang,
  silver.faq_entries,
  silver.manage,
  silver.resource_visibility,
  silver.lo3rwang_style,
  silver.lo3rwang_style_keywords,
  silver.lo3rwang_galaxy,
  silver.lo3rwang_galaxy_media,
  silver.lrunes,
  silver.v_lo3rwang_canonical_works,
  silver.v_lo3rwang_source_catalog,
  silver.v_lo3rwang_source_weekly
TO anonymous;

COMMIT;
