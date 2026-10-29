-- Public operational options only; no credentials or private content.
create table if not exists silver.loc_runtime_config (
  id text primary key check (id = 'loc'),
  cache_mode text not null default 'cache' check (cache_mode in ('off','cache','isr')),
  cache_provider text not null default '',
  isr_domains jsonb not null default '[]'::jsonb,
  io_limits jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into silver.loc_runtime_config(id, cache_mode, cache_provider, isr_domains, io_limits)
values ('loc','cache','','[]'::jsonb,'{}'::jsonb)
on conflict (id) do nothing;
alter table silver.loc_runtime_config enable row level security;
revoke all on silver.loc_runtime_config from public;
grant select on silver.loc_runtime_config to anon, authenticated;
grant update on silver.loc_runtime_config to authenticated;
drop policy if exists loc_runtime_public_read on silver.loc_runtime_config;
create policy loc_runtime_public_read on silver.loc_runtime_config for select to anon, authenticated using (true);
drop policy if exists loc_runtime_admin_update on silver.loc_runtime_config;
create policy loc_runtime_admin_update on silver.loc_runtime_config for update to authenticated
  using (silver.can_manage_global()) with check (silver.can_manage_global());
