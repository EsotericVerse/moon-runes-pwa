-- LOC global three-mode cache policy.  Provider-independent control plane.
-- Keep existing silver.loc_cache_settings (admin-only ISR domains) private.
-- This table exposes only the public effective mode + selected public ISR origin.
create table if not exists silver.loc_cache_runtime (
  id integer primary key default 1 check (id = 1),
  mode text not null default 'cache' check (mode in ('off','cache','isr')),
  origin text not null default '',
  updated_at timestamptz not null default now(),
  constraint loc_cache_runtime_origin_safe check (
    origin = '' or (length(origin) <= 512 and origin ~ '^https://[a-zA-Z0-9.-]+$')
  )
);
alter table silver.loc_cache_runtime enable row level security;
revoke all on silver.loc_cache_runtime from public, anon, authenticated;
grant select on silver.loc_cache_runtime to anon, authenticated;
grant update (mode, origin, updated_at) on silver.loc_cache_runtime to authenticated;
create policy loc_cache_runtime_public_read on silver.loc_cache_runtime
  for select to anon, authenticated using (true);
create policy loc_cache_runtime_admin_update on silver.loc_cache_runtime
  for update to authenticated
  using (silver.can_manage_global())
  with check (silver.can_manage_global());
insert into silver.loc_cache_runtime(id,mode,origin)
values (1,'cache','')
on conflict(id) do nothing;
-- Intentionally no INSERT/DELETE permission for browsers; singleton is provisioned by migration.
