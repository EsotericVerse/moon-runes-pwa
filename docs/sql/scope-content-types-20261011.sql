-- Scope-level import-time work-type catalog. No JSONB, no cross-Scope edits.
-- Apply to Supabase and Neon (primary database schema parity).
create table if not exists silver.scope_content_types (
  scope_id text not null references silver.scope_registry(scope_id) on delete cascade,
  type_code text not null check (type_code ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
  display_name text not null check (char_length(trim(display_name)) between 1 and 80),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (scope_id,type_code)
);
alter table silver.scope_content_types enable row level security;
grant select,insert,update on silver.scope_content_types to authenticated;
do $policy$
begin
  if not exists (select 1 from pg_policies where schemaname='silver' and tablename='scope_content_types' and policyname='scope_content_types_manage_read') then
    create policy scope_content_types_manage_read on silver.scope_content_types
      for select to authenticated using (silver.can_manage_scope(scope_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='silver' and tablename='scope_content_types' and policyname='scope_content_types_manage_insert') then
    create policy scope_content_types_manage_insert on silver.scope_content_types
      for insert to authenticated with check (silver.can_manage_scope(scope_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='silver' and tablename='scope_content_types' and policyname='scope_content_types_manage_update') then
    create policy scope_content_types_manage_update on silver.scope_content_types
      for update to authenticated using (silver.can_manage_scope(scope_id)) with check (silver.can_manage_scope(scope_id));
  end if;
end $policy$;
-- Adopt existing Galaxy types without modifying any existing work.
insert into silver.scope_content_types(scope_id,type_code,display_name)
select 'lo3rwang',lower(trim(content_type)),trim(content_type)
  from silver.lo3rwang_galaxy
  where content_type ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$'
  group by lower(trim(content_type)),trim(content_type)
on conflict(scope_id,type_code) do nothing;
insert into silver.scope_content_types(scope_id,type_code,display_name)
select 'lrunes',lower(trim(content_type)),trim(content_type)
  from silver.lrunes_galaxy
  where content_type ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$'
  group by lower(trim(content_type)),trim(content_type)
on conflict(scope_id,type_code) do nothing;

-- Ensure the import fallback exists for a Scope whose existing works do not have it.
insert into silver.scope_content_types(scope_id,type_code,display_name)
select scope_id,'other','其他' from silver.scope_registry where scope_kind='scope'
on conflict (scope_id,type_code) do nothing;
