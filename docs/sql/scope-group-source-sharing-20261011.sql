-- Canonical per-Scope consent for group source statistics.
-- Group categories are Admin-owned; each Scope chooses whether its own
-- facts under that group can enter LOC aggregation and other member charts.
-- Missing rows keep historical public statistics (true); a member's explicit false withdraws that group.
-- This is a statistical inclusion choice, not a content-privacy/RLS barrier.
-- Do not reuse the incorrectly proposed whole-Scope flag.
create table if not exists silver.scope_group_source_sharing (
  scope_id text not null references silver.scope_registry(scope_id) on delete cascade,
  category_code text not null references silver.statistics_source_categories(category_code)
    on update cascade on delete cascade,
  share_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (scope_id,category_code)
);
alter table silver.scope_group_source_sharing enable row level security;
-- Supabase Data API uses anon; Neon Data API uses anonymous instead.
grant select on silver.scope_group_source_sharing to anon, authenticated;
grant insert,update on silver.scope_group_source_sharing to authenticated;
create policy scope_group_source_sharing_read on silver.scope_group_source_sharing
  for select to anon,authenticated using (true);
create policy scope_group_source_sharing_insert on silver.scope_group_source_sharing
  for insert to authenticated with check (silver.can_manage_scope(scope_id));
create policy scope_group_source_sharing_update on silver.scope_group_source_sharing
  for update to authenticated
  using (silver.can_manage_scope(scope_id))
  with check (silver.can_manage_scope(scope_id));
-- No change to silver.scope_source_subcategories or Galaxy data.
-- The mistaken whole-Scope flag statistics_cross_scope_enabled was removed
-- from both built-in Scope config tables on Supabase and Neon (2026-10-11).

-- This installation originally deployed with DEFAULT false; keep existing rows unchanged
-- and restore old behavior for future rows that have not been set explicitly.
alter table silver.scope_group_source_sharing alter column share_enabled set default true;
