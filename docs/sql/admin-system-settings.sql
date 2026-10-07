-- Admin system settings: canonical LOC Theme Registry and explicit database migration/deployment targets.

create table if not exists silver.loc_theme (
  theme_id text primary key,
  theme_name text not null,
  theme_attr jsonb not null default '{}'::jsonb,
  theme_order integer not null,
  constraint loc_theme_id_check check (theme_id ~ '^theme-[1-8]$'),
  constraint loc_theme_order_check check (theme_order between 1 and 8)
);

alter table silver.loc_theme enable row level security;
drop policy if exists loc_theme_public_read on silver.loc_theme;
drop policy if exists loc_theme_admin_write on silver.loc_theme;
create policy loc_theme_public_read on silver.loc_theme
  for select to anonymous,authenticated using (true);
create policy loc_theme_admin_write on silver.loc_theme
  for all to authenticated using (silver.can_manage_global()) with check (silver.can_manage_global());
grant select on silver.loc_theme to anonymous,authenticated;
grant insert,update,delete on silver.loc_theme to authenticated;

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
