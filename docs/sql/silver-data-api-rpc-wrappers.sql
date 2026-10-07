-- Expose the application RPC surface through the already exposed silver schema.
-- Internal implementation remains in api.* so security and business logic stay centralized.

create or replace function silver.management_write(
  p_table text,
  p_operation text,
  p_rows jsonb default null,
  p_values jsonb default null,
  p_filters jsonb default '[]'::jsonb
) returns jsonb language sql security definer set search_path='' as $$
  select api.management_write(p_table,p_operation,p_rows,p_values,p_filters)
$$;

create or replace function silver.apply_keyword_classification(p_scope_id text,p_rows jsonb)
returns integer language sql security definer set search_path='' as $$
  select api.apply_keyword_classification(p_scope_id,p_rows)
$$;

create or replace function silver.read_keyword_class(p_scope_id text,p_class_id uuid)
returns jsonb language sql security definer set search_path='' as $$
  select api.read_keyword_class(p_scope_id,p_class_id)
$$;

create or replace function silver.provision_scope(
  p_scope_id text,p_display_name text,p_email text,p_birthday date default null,
  p_domain text default null,p_directory text default null,p_parent_scope_id text default 'loc',
  p_theme text default 'theme-7',p_copy_keywords boolean default true
) returns jsonb language sql security definer set search_path='' as $$
  select api.provision_scope(p_scope_id,p_display_name,p_email,p_birthday,p_domain,p_directory,p_parent_scope_id,p_theme,p_copy_keywords)
$$;

create or replace function silver.manage_scope_registry(
  p_operation text,p_scope_id text,p_values jsonb default '{}'::jsonb
) returns jsonb language sql security definer set search_path='' as $$
  select api.manage_scope_registry(p_operation,p_scope_id,p_values)
$$;

create or replace function silver.log_search_keyword(p_scope_id text,p_query_text text)
returns void language sql security definer set search_path='' as $$
  select api.log_search_keyword(p_scope_id,p_query_text)
$$;

revoke all on function silver.management_write(text,text,jsonb,jsonb,jsonb) from public;
revoke all on function silver.apply_keyword_classification(text,jsonb) from public;
revoke all on function silver.read_keyword_class(text,uuid) from public;
revoke all on function silver.provision_scope(text,text,text,date,text,text,text,text,boolean) from public;
revoke all on function silver.manage_scope_registry(text,text,jsonb) from public;
revoke all on function silver.log_search_keyword(text,text) from public;

grant execute on function silver.management_write(text,text,jsonb,jsonb,jsonb) to authenticated;
grant execute on function silver.apply_keyword_classification(text,jsonb) to authenticated;
grant execute on function silver.provision_scope(text,text,text,date,text,text,text,text,boolean) to authenticated;
grant execute on function silver.manage_scope_registry(text,text,jsonb) to authenticated;
grant execute on function silver.read_keyword_class(text,uuid) to anonymous,authenticated;
grant execute on function silver.log_search_keyword(text,text) to anonymous,authenticated;
