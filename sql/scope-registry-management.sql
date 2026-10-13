-- Scope Registry management
-- Applied to the active Supabase project as migration: manage_scope_registry
-- Scope/Group identity is immutable after creation. This RPC manages hierarchy and presentation only.

create or replace function api.manage_scope_registry(
  p_operation text,
  p_scope_id text,
  p_values jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_operation text := lower(btrim(coalesce(p_operation,'')));
  v_scope text := lower(btrim(coalesce(p_scope_id,'')));
  v_values jsonb := coalesce(p_values,'{}'::jsonb);
  v_current silver.scope_registry%rowtype;
  v_name text;
  v_domain text;
  v_directory text;
  v_parent text;
  v_active boolean;
  v_sort integer;
  v_cycle boolean := false;
begin
  if not silver.can_manage_global() then
    raise exception 'global management permission denied';
  end if;
  if v_scope !~ '^[a-z][a-z0-9]{0,14}$' then
    raise exception 'Scope ID must be 1-15 lowercase alphanumeric characters and start with a letter';
  end if;
  if jsonb_typeof(v_values) <> 'object' then
    raise exception 'values must be an object';
  end if;

  if v_operation='create_group' then
    if exists(select 1 from silver.scope_registry where scope_id=v_scope) then
      raise exception 'Scope registry ID already exists';
    end if;
    v_name := btrim(coalesce(v_values->>'display_name',''));
    v_domain := lower(btrim(coalesce(v_values->>'domain','')));
    v_directory := lower(btrim(coalesce(v_values->>'directory','')));
    v_parent := lower(btrim(coalesce(v_values->>'parent_scope_id','loc')));
    v_active := coalesce((v_values->>'active')::boolean,true);
    if v_name='' then raise exception 'display name is required'; end if;
    if (v_domain='')=(v_directory='') then raise exception 'exactly one of domain or directory is required'; end if;
    if v_domain<>'' and v_domain !~ '^[a-z0-9][a-z0-9.-]*[a-z0-9]$' then raise exception 'domain format is invalid'; end if;
    if v_directory<>'' then
      v_directory := '/'||btrim(v_directory,'/');
      if btrim(v_directory,'/') !~ '^[a-z0-9][a-z0-9/_-]*$' then raise exception 'directory format is invalid'; end if;
    end if;
    if not exists(select 1 from silver.scope_registry where scope_id=v_parent and scope_kind='group' and active) then
      raise exception 'parent Scope Group does not exist or is inactive';
    end if;
    if v_values ? 'sort_order' then
      v_sort := coalesce((v_values->>'sort_order')::integer,0);
    else
      select coalesce(max(sort_order),0)+10 into v_sort
      from silver.scope_registry where parent_scope_id=v_parent;
    end if;
    insert into silver.scope_registry(scope_id,display_name,scope_kind,domain,directory,parent_scope_id,active,sort_order)
    values(v_scope,v_name,'group',nullif(v_domain,''),nullif(v_directory,''),v_parent,v_active,v_sort)
    returning * into v_current;

  elsif v_operation='update' then
    select * into v_current from silver.scope_registry where scope_id=v_scope;
    if not found then raise exception 'Scope registry row not found'; end if;
    if v_current.scope_kind='system' then raise exception 'system registry rows are immutable'; end if;

    v_name := case when v_values ? 'display_name' then btrim(coalesce(v_values->>'display_name','')) else v_current.display_name end;
    v_domain := case when v_values ? 'domain' then lower(btrim(coalesce(v_values->>'domain',''))) else coalesce(v_current.domain,'') end;
    v_directory := case when v_values ? 'directory' then lower(btrim(coalesce(v_values->>'directory',''))) else coalesce(v_current.directory,'') end;
    v_parent := case when v_values ? 'parent_scope_id' then lower(btrim(coalesce(v_values->>'parent_scope_id',''))) else coalesce(v_current.parent_scope_id,'') end;
    v_active := case when v_values ? 'active' then coalesce((v_values->>'active')::boolean,false) else v_current.active end;
    v_sort := case when v_values ? 'sort_order' then coalesce((v_values->>'sort_order')::integer,0) else v_current.sort_order end;

    if v_name='' then raise exception 'display name is required'; end if;
    if (v_domain='')=(v_directory='') then raise exception 'exactly one of domain or directory is required'; end if;
    if v_domain<>'' and v_domain !~ '^[a-z0-9][a-z0-9.-]*[a-z0-9]$' then raise exception 'domain format is invalid'; end if;
    if v_directory<>'' then
      v_directory := '/'||btrim(v_directory,'/');
      if btrim(v_directory,'/') !~ '^[a-z0-9][a-z0-9/_-]*$' then raise exception 'directory format is invalid'; end if;
    end if;

    if v_scope='loc' then
      if v_parent<>'' then raise exception 'root LOC group cannot have a parent'; end if;
      if not v_active then raise exception 'root LOC group cannot be disabled'; end if;
    else
      if v_parent='' then raise exception 'non-root registry rows require a parent Scope Group'; end if;
      if v_parent=v_scope then raise exception 'Scope cannot parent itself'; end if;
      if not exists(select 1 from silver.scope_registry where scope_id=v_parent and scope_kind='group' and active) then
        raise exception 'parent Scope Group does not exist or is inactive';
      end if;
    end if;

    if v_current.scope_kind='group' and v_parent<>'' then
      with recursive ancestors(scope_id,parent_scope_id) as (
        select r.scope_id,r.parent_scope_id from silver.scope_registry r where r.scope_id=v_parent
        union all
        select r.scope_id,r.parent_scope_id
        from silver.scope_registry r join ancestors a on r.scope_id=a.parent_scope_id
        where a.parent_scope_id is not null
      )
      select exists(select 1 from ancestors where scope_id=v_scope) into v_cycle;
      if v_cycle then raise exception 'Scope Group parent would create a cycle'; end if;
    end if;

    if v_current.scope_kind='group' and not v_active and exists(
      select 1 from silver.scope_registry where parent_scope_id=v_scope and active
    ) then
      raise exception 'move or disable active child Scopes before disabling this Group';
    end if;

    update silver.scope_registry
    set display_name=v_name,domain=nullif(v_domain,''),directory=nullif(v_directory,''),
        parent_scope_id=nullif(v_parent,''),active=v_active,sort_order=v_sort,updated_at=now()
    where scope_id=v_scope
    returning * into v_current;
  else
    raise exception 'unsupported Scope Registry operation';
  end if;

  return jsonb_build_object(
    'scope_id',v_current.scope_id,'display_name',v_current.display_name,'scope_kind',v_current.scope_kind,
    'domain',v_current.domain,'directory',v_current.directory,'parent_scope_id',v_current.parent_scope_id,
    'active',v_current.active,'sort_order',v_current.sort_order
  );
end;
$function$;

revoke all on function api.manage_scope_registry(text,text,jsonb) from public;
revoke all on function api.manage_scope_registry(text,text,jsonb) from anonymous;
grant execute on function api.manage_scope_registry(text,text,jsonb) to authenticated;
