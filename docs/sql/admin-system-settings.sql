-- Admin system settings: editable Theme Registry and explicit database migration/deployment targets.

create table if not exists silver.theme_registry (
  theme_id text primary key,
  label text not null,
  scheme text not null check (scheme in ('light','dark')),
  tokens jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint theme_registry_id_check check (theme_id ~ '^theme-[1-8]$')
);

alter table silver.theme_registry enable row level security;
drop policy if exists theme_registry_public_read on silver.theme_registry;
drop policy if exists theme_registry_admin_write on silver.theme_registry;
create policy theme_registry_public_read on silver.theme_registry
  for select to anonymous,authenticated using (true);
create policy theme_registry_admin_write on silver.theme_registry
  for all to authenticated using (silver.can_manage_global()) with check (silver.can_manage_global());
grant select on silver.theme_registry to anonymous,authenticated;
grant insert,update,delete on silver.theme_registry to authenticated;

insert into silver.theme_registry(theme_id,label,scheme)
values
 ('theme-1','靈魂','dark'),('theme-2','連結','light'),('theme-3','生命','light'),('theme-4','自然','light'),
 ('theme-5','礦物','light'),('theme-6','元素','dark'),('theme-7','秩序','light'),('theme-8','無序','dark')
on conflict(theme_id) do nothing;

create table if not exists silver.database_targets (
  target_id text primary key,
  provider text not null check (provider in ('supabase','neon')),
  label text not null,
  project_id text,
  project_url text not null,
  selected boolean not null default false,
  updated_at timestamptz not null default now()
);

create unique index if not exists database_targets_one_selected
  on silver.database_targets((selected)) where selected;

alter table silver.database_targets enable row level security;
drop policy if exists database_targets_admin_all on silver.database_targets;
create policy database_targets_admin_all on silver.database_targets
  for all to authenticated using (silver.can_manage_global()) with check (silver.can_manage_global());
grant select,insert,update,delete on silver.database_targets to authenticated;

insert into silver.database_targets(target_id,provider,label,project_id,project_url,selected)
values
 ('supabase-current','supabase','Supabase · loc-postgres-portability','qlouywsdiiyiyzpoxyqy','https://qlouywsdiiyiyzpoxyqy.supabase.co',true),
 ('neon-current','neon','Neon · backup',null,'https://ep-rapid-queen-b3oyboy6.apirest.c-4.ap-southeast-1.aws.neon.tech/neondb/rest/v1',false)
on conflict(target_id) do nothing;
