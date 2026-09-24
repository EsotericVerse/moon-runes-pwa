-- Match database admin checks to the app's existing grant contract:
-- global administration is scope_manager on scope_id = 'admin'.
create or replace function api.can_manage_scope_page(p_scope_id text)
returns boolean
language sql
stable
security definer
set search_path to 'api','public'
as $function$
  select api.has_scope_access('admin',array['scope_manager']::text[])
      or (
        p_scope_id <> 'admin'
        and api.has_scope_access(p_scope_id,array['scope_owner','scope_manager','page_manager']::text[])
      );
$function$;
