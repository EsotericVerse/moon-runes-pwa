create table if not exists silver.loc_style_tag_keywords (
  scope_id text not null,
  style_tag text not null,
  keyword text not null,
  order_no integer not null default 0,
  primary key (scope_id,style_tag,keyword)
);

create index if not exists loc_style_tag_keywords_scope_order_idx
  on silver.loc_style_tag_keywords (scope_id,style_tag,order_no,keyword);

create or replace function api.can_manage_culture_scope(p_scope_id text)
returns boolean
language sql
stable
security definer
set search_path to 'api','public'
as $$
  select api.has_scope_access('admin',array['scope_manager']::text[])
      or api.has_scope_access(p_scope_id,array['scope_manager']::text[])
      or exists (
        select 1
        from api.scope_access_grants grant_row
        where grant_row.user_id=api.current_scope_user_id()
          and grant_row.scope_id=p_scope_id
          and grant_row.access_level='page_manager'
          and grant_row.case_id='culture'
      )
$$;

alter table silver.loc_timeline_entries enable row level security;
alter table silver.loc_style_tag_keywords enable row level security;

drop policy if exists loc_timeline_entries_public_read on silver.loc_timeline_entries;
create policy loc_timeline_entries_public_read
  on silver.loc_timeline_entries
  for select to anonymous,authenticated
  using (true);

drop policy if exists loc_style_tag_keywords_public_read on silver.loc_style_tag_keywords;
create policy loc_style_tag_keywords_public_read
  on silver.loc_style_tag_keywords
  for select to anonymous,authenticated
  using (true);

drop policy if exists loc_timeline_entries_culture_insert on silver.loc_timeline_entries;
create policy loc_timeline_entries_culture_insert
  on silver.loc_timeline_entries
  for insert to authenticated
  with check (api.can_manage_culture_scope(scope_id));

drop policy if exists loc_timeline_entries_culture_update on silver.loc_timeline_entries;
create policy loc_timeline_entries_culture_update
  on silver.loc_timeline_entries
  for update to authenticated
  using (api.can_manage_culture_scope(scope_id))
  with check (api.can_manage_culture_scope(scope_id));

drop policy if exists loc_timeline_entries_culture_delete on silver.loc_timeline_entries;
create policy loc_timeline_entries_culture_delete
  on silver.loc_timeline_entries
  for delete to authenticated
  using (api.can_manage_culture_scope(scope_id));

drop policy if exists loc_style_tag_keywords_culture_insert on silver.loc_style_tag_keywords;
create policy loc_style_tag_keywords_culture_insert
  on silver.loc_style_tag_keywords
  for insert to authenticated
  with check (api.can_manage_culture_scope(scope_id));

drop policy if exists loc_style_tag_keywords_culture_update on silver.loc_style_tag_keywords;
create policy loc_style_tag_keywords_culture_update
  on silver.loc_style_tag_keywords
  for update to authenticated
  using (api.can_manage_culture_scope(scope_id))
  with check (api.can_manage_culture_scope(scope_id));

drop policy if exists loc_style_tag_keywords_culture_delete on silver.loc_style_tag_keywords;
create policy loc_style_tag_keywords_culture_delete
  on silver.loc_style_tag_keywords
  for delete to authenticated
  using (api.can_manage_culture_scope(scope_id));

grant select on silver.loc_timeline_entries,silver.loc_style_tag_keywords to anonymous,authenticated;
grant insert,update,delete on silver.loc_timeline_entries,silver.loc_style_tag_keywords to authenticated;
grant execute on function api.can_manage_culture_scope(text) to authenticated;

create or replace function api.loc_culture_weekly_source_counts(p_start_date date,p_end_date date default null)
returns table (week_start date,week_end date,source text,work_count bigint)
language sql
stable
security invoker
set search_path to 'api','public'
as $$
  select date_trunc('week',works.created_at)::date as week_start,
         (date_trunc('week',works.created_at)+interval '7 days')::date as week_end,
         coalesce(nullif(btrim(works.source_platform),''),'未標示來源') as source,
         count(*) as work_count
  from api.lo3rwang_galaxy works
  where works.created_at>=p_start_date::timestamptz
    and (p_end_date is null or works.created_at<(p_end_date+1)::timestamptz)
  group by 1,2,3
  order by 1 desc,3
$$;

grant execute on function api.loc_culture_weekly_source_counts(date,date) to anonymous,authenticated;
