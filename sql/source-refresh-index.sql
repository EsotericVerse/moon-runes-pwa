-- Source Refresh lookup support
-- Applied to the active Supabase project as migration: source_refresh_lookup_index
-- New Scope Galaxy tables inherit template indexes through CREATE TABLE ... LIKE silver.lo3rwang_galaxy INCLUDING ALL.

create index if not exists idx_lo3rwang_galaxy_source_native
on silver.lo3rwang_galaxy (source_name,source_native_id)
where source_name is not null and source_native_id is not null;
