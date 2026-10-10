-- LOC 0.9.3 RC: distinct administrative source categories and Scope-owned Others.
-- No JSONB, no per-work data rewrite, no visibility or sharing elevation.
create table if not exists silver.statistics_source_categories (
  category_code text primary key check (category_code ~ '^[a-z][a-z0-9_-]{0,63}$'),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  sort_order integer not null default 100,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists silver.statistics_source_aliases (
  source_key text primary key check (char_length(btrim(source_key)) between 1 and 120 and source_key=lower(btrim(source_key))),
  category_code text not null references silver.statistics_source_categories(category_code),
  created_at timestamptz not null default now()
);
create table if not exists silver.scope_other_sources (
  scope_id text not null references silver.scope_registry(scope_id) on delete cascade,
  source_key text not null check (char_length(btrim(source_key)) between 1 and 120 and source_key=lower(btrim(source_key))),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  primary key(scope_id,source_key)
);
create index if not exists scope_other_sources_scope_idx on silver.scope_other_sources(scope_id);
alter table silver.statistics_source_categories enable row level security;
alter table silver.statistics_source_aliases enable row level security;
alter table silver.scope_other_sources enable row level security;
grant select on silver.statistics_source_categories,silver.statistics_source_aliases,silver.scope_other_sources to anon,authenticated;
grant insert,update on silver.statistics_source_categories,silver.statistics_source_aliases,silver.scope_other_sources to authenticated;
do $policy$
begin
  if not exists(select 1 from pg_policies where schemaname='silver' and tablename='statistics_source_categories' and policyname='source_categories_public_read') then
    create policy source_categories_public_read on silver.statistics_source_categories for select to anon,authenticated using (true);
  end if;
  if not exists(select 1 from pg_policies where schemaname='silver' and tablename='statistics_source_categories' and policyname='source_categories_admin_insert') then
    create policy source_categories_admin_insert on silver.statistics_source_categories for insert to authenticated with check (silver.can_manage_global());
  end if;
  if not exists(select 1 from pg_policies where schemaname='silver' and tablename='statistics_source_categories' and policyname='source_categories_admin_update') then
    create policy source_categories_admin_update on silver.statistics_source_categories for update to authenticated using (silver.can_manage_global()) with check (silver.can_manage_global());
  end if;
  if not exists(select 1 from pg_policies where schemaname='silver' and tablename='statistics_source_aliases' and policyname='source_aliases_public_read') then
    create policy source_aliases_public_read on silver.statistics_source_aliases for select to anon,authenticated using (true);
  end if;
  if not exists(select 1 from pg_policies where schemaname='silver' and tablename='statistics_source_aliases' and policyname='source_aliases_admin_insert') then
    create policy source_aliases_admin_insert on silver.statistics_source_aliases for insert to authenticated with check (silver.can_manage_global());
  end if;
  if not exists(select 1 from pg_policies where schemaname='silver' and tablename='statistics_source_aliases' and policyname='source_aliases_admin_update') then
    create policy source_aliases_admin_update on silver.statistics_source_aliases for update to authenticated using (silver.can_manage_global()) with check (silver.can_manage_global());
  end if;
  if not exists(select 1 from pg_policies where schemaname='silver' and tablename='scope_other_sources' and policyname='scope_other_sources_public_read') then
    create policy scope_other_sources_public_read on silver.scope_other_sources for select to anon,authenticated using (true);
  end if;
  if not exists(select 1 from pg_policies where schemaname='silver' and tablename='scope_other_sources' and policyname='scope_other_sources_scope_insert') then
    create policy scope_other_sources_scope_insert on silver.scope_other_sources for insert to authenticated with check (silver.can_manage_scope(scope_id));
  end if;
  if not exists(select 1 from pg_policies where schemaname='silver' and tablename='scope_other_sources' and policyname='scope_other_sources_scope_update') then
    create policy scope_other_sources_scope_update on silver.scope_other_sources for update to authenticated using (silver.can_manage_scope(scope_id)) with check (silver.can_manage_scope(scope_id));
  end if;
end $policy$;
-- Existing default categories and exact-name mappings; changes after creation
-- are administered via the LOC Admin UI, not hard-coded in analytics.
insert into silver.statistics_source_categories(category_code,display_name,sort_order)
values ('facebook','Facebook',10),('threads','Threads',20),('instagram','Instagram',30),('others','Others',90)
on conflict(category_code) do nothing;
insert into silver.statistics_source_aliases(source_key,category_code)
values ('facebook','facebook'),('fb','facebook'),('threads','threads'),
('instagram','instagram'),('ig','instagram'),('reels','instagram')
on conflict(source_key) do nothing;
