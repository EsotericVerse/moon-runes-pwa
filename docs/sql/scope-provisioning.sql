-- Scope provisioning contract
-- Applied through the authenticated Admin surface. The function is transactional:
-- if any table, policy, mapping, registry row or Rune66 copy fails, PostgreSQL rolls the whole call back.

create table if not exists silver.scope_registry (
  scope_id text primary key,
  display_name text not null,
  scope_kind text not null default 'scope',
  domain text,
  directory text,
  parent_scope_id text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scope_registry_id_check check (scope_id ~ '^[a-z][a-z0-9]{0,14}$'),
  constraint scope_registry_name_check check (btrim(display_name) <> ''),
  constraint scope_registry_kind_check check (scope_kind in ('scope','group','system')),
  constraint scope_registry_route_check check (
    (domain is not null and btrim(domain) <> '' and (directory is null or btrim(directory)=''))
    or
    (directory is not null and btrim(directory) <> '' and (domain is null or btrim(domain)=''))
  ),
  constraint scope_registry_parent_fk foreign key (parent_scope_id)
    references silver.scope_registry(scope_id) on update cascade on delete restrict
);

create unique index if not exists scope_registry_domain_unique
  on silver.scope_registry (lower(domain))
  where domain is not null and btrim(domain)<>'';
create unique index if not exists scope_registry_directory_unique
  on silver.scope_registry (lower(directory))
  where directory is not null and btrim(directory)<>'';
create index if not exists scope_registry_parent_idx
  on silver.scope_registry(parent_scope_id)
  where parent_scope_id is not null;

alter table silver.scope_registry enable row level security;
drop policy if exists scope_registry_public_read on silver.scope_registry;
drop policy if exists scope_registry_admin_read on silver.scope_registry;
drop policy if exists scope_registry_anonymous_read on silver.scope_registry;
drop policy if exists scope_registry_authenticated_read on silver.scope_registry;
create policy scope_registry_anonymous_read on silver.scope_registry
  for select to anonymous using (active);
create policy scope_registry_authenticated_read on silver.scope_registry
  for select to authenticated using (active or silver.can_manage_global());
grant select on silver.scope_registry to anonymous, authenticated;

insert into silver.scope_registry
  (scope_id,display_name,scope_kind,domain,directory,parent_scope_id,active,sort_order)
values
  ('loc','LOC 月典','group','loc.lo3rwang.cc',null,null,true,0),
  ('lrunes','月之符文','scope',null,'/lrunes','loc',true,10),
  ('lo3rwang','Lucas Oscar Wang 政德','scope',null,'/lo3rwang','loc',true,20),
  ('admin','Admin','system','admin.lo3rwang.cc',null,null,true,100)
on conflict (scope_id) do update set
  display_name=excluded.display_name,
  scope_kind=excluded.scope_kind,
  domain=excluded.domain,
  directory=excluded.directory,
  parent_scope_id=excluded.parent_scope_id,
  active=excluded.active,
  sort_order=excluded.sort_order,
  updated_at=now();

create or replace function api.provision_scope(
  p_scope_id text,
  p_display_name text,
  p_email text,
  p_birthday date default null,
  p_domain text default null,
  p_directory text default null,
  p_parent_scope_id text default 'loc',
  p_theme text default 'theme-7',
  p_copy_keywords boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_scope text := lower(btrim(coalesce(p_scope_id,'')));
  v_name text := btrim(coalesce(p_display_name,''));
  v_email text := lower(btrim(coalesce(p_email,'')));
  v_domain text := lower(btrim(coalesce(p_domain,'')));
  v_directory text := lower(btrim(coalesce(p_directory,'')));
  v_parent text := lower(btrim(coalesce(p_parent_scope_id,'loc')));
  v_theme text := lower(btrim(coalesce(p_theme,'theme-7')));
  v_config_name text;
  v_galaxy_name text;
  v_media_name text;
  v_time_name text;
  v_keywords_name text;
  v_blocks_name text;
  v_source_class uuid;
  v_new_class uuid;
  v_keyword_count integer := 0;
  v_keyword_sequence text;
  v_sort_order integer := 0;
begin
  if not silver.can_manage_global() then raise exception 'global management permission denied'; end if;
  if v_scope !~ '^[a-z][a-z0-9]{0,14}$' then raise exception 'Scope ID must be 1-15 lowercase alphanumeric characters and start with a letter'; end if;
  if v_name='' then raise exception 'display name is required'; end if;
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'email format is invalid'; end if;
  if v_theme !~ '^theme-[1-8]$' then raise exception 'theme must be theme-1 through theme-8'; end if;
  if (v_domain='') = (v_directory='') then raise exception 'exactly one of domain or directory is required'; end if;
  if v_domain<>'' and v_domain !~ '^[a-z0-9][a-z0-9.-]*[a-z0-9]$' then raise exception 'domain format is invalid'; end if;
  if v_directory<>'' then
    v_directory := '/'||btrim(v_directory,'/');
    if btrim(v_directory,'/') !~ '^[a-z0-9][a-z0-9/_-]*$' then raise exception 'directory format is invalid'; end if;
  end if;
  if v_parent='' then v_parent := 'loc'; end if;
  if not exists(select 1 from silver.scope_registry where scope_id=v_parent and scope_kind='group' and active)
  then raise exception 'parent Scope Group does not exist or is inactive'; end if;
  if exists(select 1 from silver.scope_registry where scope_id=v_scope) or exists(select 1 from silver.manage where id=v_scope)
  then raise exception 'Scope already exists'; end if;
  if v_domain<>'' and exists(select 1 from silver.scope_registry where lower(domain)=v_domain)
  then raise exception 'domain already belongs to another Scope'; end if;
  if v_directory<>'' and exists(select 1 from silver.scope_registry where lower(directory)=v_directory)
  then raise exception 'directory already belongs to another Scope'; end if;

  v_config_name := v_scope;
  v_galaxy_name := v_scope||'_galaxy';
  v_media_name := v_scope||'_galaxy_media';
  v_time_name := v_scope||'_time';
  v_keywords_name := v_scope||'_keywords';
  v_blocks_name := v_scope||'_blocks';

  if to_regclass(format('silver.%I',v_config_name)) is not null
    or to_regclass(format('silver.%I',v_galaxy_name)) is not null
    or to_regclass(format('silver.%I',v_media_name)) is not null
    or to_regclass(format('silver.%I',v_time_name)) is not null
    or to_regclass(format('silver.%I',v_keywords_name)) is not null
    or to_regclass(format('silver.%I',v_blocks_name)) is not null
  then raise exception 'one or more Scope relations already exist'; end if;

  execute format('create table silver.%I (like silver.lo3rwang including all)',v_config_name);
  execute format('alter table silver.%I drop column if exists home_blocks',v_config_name);
  execute format('alter table silver.%I drop column if exists governance_blocks',v_config_name);
  execute format('create table silver.%I (uid character(8) not null default upper(substr(replace(gen_random_uuid()::text,''-'',''''),1,8)), page_name text not null, block_title text not null default '''', block_text text not null default '''', block_order integer not null, block_entity jsonb not null default ''[]''::jsonb, primary key(uid), check(uid ~ ''^[A-Za-z0-9]{8}
  execute format('create table silver.%I (like silver.lo3rwang_galaxy including all)',v_galaxy_name);
  execute format('create table silver.%I (like silver.lo3rwang_galaxy_media including all)',v_media_name);
  execute format('create table silver.%I (like silver.lo3rwang_time including all)',v_time_name);
  execute format('create table silver.%I (like silver.lo3rwang_keywords including all)',v_keywords_name);

  execute format('alter table silver.%I add constraint %I foreign key (galaxy_link) references silver.%I(uid)',v_media_name,v_scope||'_galaxy_media_galaxy_link_fk',v_galaxy_name);
  execute format('alter table silver.%I add constraint %I foreign key (current_keyword_class_id) references silver.keyword_classes(class_id)',v_config_name,v_scope||'_current_keyword_class_fk');
  execute format('alter table silver.%I add constraint %I foreign key (class_id) references silver.keyword_classes(class_id)',v_keywords_name,v_scope||'_keywords_class_fk');

  execute format('alter table silver.%I enable row level security',v_config_name);
  execute format('alter table silver.%I enable row level security',v_galaxy_name);
  execute format('alter table silver.%I enable row level security',v_media_name);
  execute format('alter table silver.%I enable row level security',v_time_name);
  execute format('alter table silver.%I enable row level security',v_keywords_name);
  execute format('alter table silver.%I enable row level security',v_blocks_name);

  execute format('create policy %I on silver.%I for select to anonymous,authenticated using (true)',v_scope||'_config_public_read',v_config_name);
  execute format('create policy %I on silver.%I for update to authenticated using (silver.can_manage_scope(%L)) with check (silver.can_manage_scope(%L))',v_scope||'_config_scope_update',v_config_name,v_scope,v_scope);
  execute format('create policy %I on silver.%I for select to anonymous,authenticated using (true)',v_scope||'_galaxy_public_read',v_galaxy_name);
  execute format('create policy %I on silver.%I for update to authenticated using (silver.can_manage_scope(%L)) with check (silver.can_manage_scope(%L))',v_scope||'_galaxy_scope_update',v_galaxy_name,v_scope,v_scope);
  execute format('create policy %I on silver.%I for select to anonymous,authenticated using (true)',v_scope||'_media_public_read',v_media_name);
  execute format('create policy %I on silver.%I for update to authenticated using (silver.can_manage_scope(%L)) with check (silver.can_manage_scope(%L))',v_scope||'_media_scope_update',v_media_name,v_scope,v_scope);
  execute format('create policy %I on silver.%I for select to anonymous,authenticated using (true)',v_scope||'_time_public_read',v_time_name);
  execute format('create policy %I on silver.%I for all to authenticated using (silver.can_manage_scope(%L)) with check (silver.can_manage_scope(%L))',v_scope||'_time_scope_all',v_time_name,v_scope,v_scope);
  execute format('create policy %I on silver.%I for all to authenticated using (silver.can_manage_scope(%L)) with check (silver.can_manage_scope(%L))',v_scope||'_keywords_scope_all',v_keywords_name,v_scope,v_scope);
  execute format('create policy %I on silver.%I for select to anonymous,authenticated using (true)',v_scope||'_blocks_public_read',v_blocks_name);
  execute format('create policy %I on silver.%I for all to authenticated using (silver.can_manage_scope(%L)) with check (silver.can_manage_scope(%L))',v_scope||'_blocks_scope_all',v_blocks_name,v_scope,v_scope);

  execute format('grant select on silver.%I to anonymous,authenticated',v_config_name);
  execute format('grant update on silver.%I to authenticated',v_config_name);
  execute format('grant select on silver.%I to anonymous,authenticated',v_galaxy_name);
  execute format('grant update on silver.%I to authenticated',v_galaxy_name);
  execute format('grant select on silver.%I to anonymous,authenticated',v_media_name);
  execute format('grant update on silver.%I to authenticated',v_media_name);
  execute format('grant select on silver.%I to anonymous,authenticated',v_time_name);
  execute format('grant select,insert,update,delete on silver.%I to authenticated',v_keywords_name);
  execute format('grant select on silver.%I to anonymous,authenticated',v_blocks_name);
  execute format('grant insert,update,delete on silver.%I to authenticated',v_blocks_name);
  v_keyword_sequence := pg_get_serial_sequence(format('silver.%I',v_keywords_name),'keyword_id');
  if v_keyword_sequence is not null then execute format('grant usage,select on sequence %s to authenticated',v_keyword_sequence); end if;

  insert into silver.manage(id,email,role,galaxy,time,birthday)
  values(v_scope,v_email,'scope','galaxy','time',p_birthday);

  select coalesce(max(sort_order),0)+10 into v_sort_order from silver.scope_registry where parent_scope_id=v_parent;
  insert into silver.scope_registry(scope_id,display_name,scope_kind,domain,directory,parent_scope_id,active,sort_order)
  values(v_scope,v_name,'scope',nullif(v_domain,''),nullif(v_directory,''),v_parent,true,v_sort_order);

  if p_copy_keywords then
    select current_keyword_class_id into v_source_class from silver.lo3rwang where id='lo3rwang';
    if v_source_class is null then raise exception 'lo3rwang current Keyword Class is not configured'; end if;
    v_new_class := gen_random_uuid();
    insert into silver.keyword_classes(class_id,scope_id) values(v_new_class,v_scope);
    execute format(
      'insert into silver.%I
        (class_id,group_name,item_no,item_name,principle,keywords,order_no,class_name,class_group,class_enable)
       select $1,group_name,item_no,item_name,principle,keywords,order_no,class_name,class_group,class_enable
       from silver.lo3rwang_keywords where class_id=$2 order by order_no,item_no',
      v_keywords_name
    ) using v_new_class,v_source_class;
    get diagnostics v_keyword_count = row_count;
    if v_keyword_count<>66 then raise exception 'Rune66 default copy expected 66 rows, copied %',v_keyword_count; end if;
  end if;

  execute format(
    'insert into silver.%I
      (id,email,display_name,search_intro,search_aliases,theme,locale,search_able,statistics_able,culture_able,
       keyword_min_chars,keyword_min_documents,current_keyword_class_id,
       keyword_class_share_enabled,keyword_document_count,keyword_meta,staticstime,updated_at)
     values($1,$2,$3,'''',array[$1,$3]::text[],$4,''zh-Hant'',true,true,true,32,100,$5,false,0,''{}''::jsonb,null,now())',
    v_config_name
  ) using v_scope,v_email,v_name,v_theme,v_new_class;

  execute format(
    'insert into silver.%I(block_page,block_title,block_text,block_order)
     select p.page,'''','''',o.n
     from (values (''home''),(''governance'')) as p(page)
     cross join generate_series(1,4) as o(n)',
    v_blocks_name
  );

  return jsonb_build_object(
    'scope_id',v_scope,'display_name',v_name,'parent_scope_id',v_parent,
    'route_mode',case when v_domain<>'' then 'domain' else 'directory' end,
    'route_value',case when v_domain<>'' then v_domain else v_directory end,
    'keyword_rows',v_keyword_count,'keyword_class_id',v_new_class
  );
end;
$function$;

revoke all on function api.provision_scope(text,text,text,date,text,text,text,text,boolean) from public;
revoke all on function api.provision_scope(text,text,text,date,text,text,text,text,boolean) from anonymous;
grant execute on function api.provision_scope(text,text,text,date,text,text,text,text,boolean) to authenticated;

create or replace function api.apply_keyword_classification(p_scope_id text,p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_scope text := lower(btrim(coalesce(p_scope_id,'')));
  v_mode text := lower(coalesce(p_rows->>'mode',''));
  v_rows jsonb := p_rows->'rows';
  v_meta jsonb := coalesce(p_rows->'meta','{}'::jsonb);
  v_config regclass;
  v_galaxy regclass;
  v_galaxy_suffix text;
  v_affected integer := 0;
  v_document_count integer := 0;
  v_expected integer := 0;
  v_meta_class_id text := '';
begin
  if v_scope !~ '^[a-z][a-z0-9]{0,14}$' then raise exception 'invalid Scope ID'; end if;
  if not silver.can_manage_scope(v_scope) then raise exception 'Scope management permission denied'; end if;
  select coalesce(nullif(galaxy,''),'galaxy') into v_galaxy_suffix
    from silver.manage where id=v_scope order by case when role='admin' then 0 else 1 end,email limit 1;
  if v_galaxy_suffix is null then raise exception 'Scope mapping not found'; end if;
  v_config := to_regclass(format('silver.%I',v_scope));
  v_galaxy := to_regclass(format('silver.%I',v_scope||'_'||v_galaxy_suffix));
  if v_config is null or v_galaxy is null then raise exception 'Scope keyword classification relations are missing'; end if;

  if v_mode='begin' then
    execute format('update %s set class_id=null,group_lists=''false''::jsonb',v_galaxy);
    get diagnostics v_affected = row_count;
    execute format('update %s set staticstime=null,keyword_document_count=0,keyword_meta=''{}''::jsonb,updated_at=now() where id=$1',v_config) using v_scope;
    if not found then raise exception 'Scope config row not found'; end if;
    return v_affected;
  end if;

  if v_mode='chunk' then
    if jsonb_typeof(v_rows)<>'array' then raise exception 'rows must be an array'; end if;
    v_expected := jsonb_array_length(v_rows);
    execute format(
      'with payload as (
         select upper(btrim(x.uid))::character(8) as uid,x.class_id,coalesce(x.group_lists,''{}''::jsonb) as group_lists
         from jsonb_to_recordset($1) as x(uid text,class_id smallint,group_lists jsonb)
         where btrim(coalesce(x.uid,''''))
       )
       update %s as g set class_id=p.class_id,group_lists=p.group_lists from payload p where g.uid=p.uid',
      v_galaxy
    ) using v_rows;
    get diagnostics v_affected = row_count;
    if v_affected<>v_expected then raise exception 'keyword classification chunk incomplete: expected %, affected %',v_expected,v_affected; end if;
    return v_affected;
  end if;

  if v_mode='finalize' then
    v_meta_class_id := coalesce(v_meta->>'class_id','');
    if v_meta_class_id='' then raise exception 'classification metadata class_id is required'; end if;
    execute format('select count(*) from %s where id=$1 and current_keyword_class_id::text=$2',v_config)
      into v_expected using v_scope,v_meta_class_id;
    if v_expected<>1 then raise exception 'current keyword Class changed before finalize'; end if;
    execute format('select count(*) from %s where group_lists<>''false''::jsonb',v_galaxy) into v_document_count;
    execute format('update %s set staticstime=now(),keyword_document_count=$2,keyword_meta=$3,updated_at=now() where id=$1',v_config)
      using v_scope,v_document_count,v_meta;
    if not found then raise exception 'Scope config row not found'; end if;
    return v_document_count;
  end if;
  raise exception 'unsupported keyword classification mode';
end;
$function$;

create or replace function api.apply_keyword_classification(p_rows jsonb)
returns integer language sql set search_path = ''
as $function$ select api.apply_keyword_classification('lo3rwang',p_rows) $function$;

revoke all on function api.apply_keyword_classification(text,jsonb) from public;
revoke all on function api.apply_keyword_classification(text,jsonb) from anonymous;
grant execute on function api.apply_keyword_classification(text,jsonb) to authenticated;
revoke all on function api.apply_keyword_classification(jsonb) from public;
revoke all on function api.apply_keyword_classification(jsonb) from anonymous;
grant execute on function api.apply_keyword_classification(jsonb) to authenticated;
'), check(block_order >= 1), check(jsonb_typeof(block_entity)=''array'' and jsonb_array_length(block_entity)<=6))',v_blocks_name);
  execute format('create table silver.%I (like silver.lo3rwang_galaxy including all)',v_galaxy_name);
  execute format('create table silver.%I (like silver.lo3rwang_galaxy_media including all)',v_media_name);
  execute format('create table silver.%I (like silver.lo3rwang_time including all)',v_time_name);
  execute format('create table silver.%I (like silver.lo3rwang_keywords including all)',v_keywords_name);

  execute format('alter table silver.%I add constraint %I foreign key (galaxy_link) references silver.%I(uid)',v_media_name,v_scope||'_galaxy_media_galaxy_link_fk',v_galaxy_name);
  execute format('alter table silver.%I add constraint %I foreign key (current_keyword_class_id) references silver.keyword_classes(class_id)',v_config_name,v_scope||'_current_keyword_class_fk');
  execute format('alter table silver.%I add constraint %I foreign key (class_id) references silver.keyword_classes(class_id)',v_keywords_name,v_scope||'_keywords_class_fk');

  execute format('alter table silver.%I enable row level security',v_config_name);
  execute format('alter table silver.%I enable row level security',v_galaxy_name);
  execute format('alter table silver.%I enable row level security',v_media_name);
  execute format('alter table silver.%I enable row level security',v_time_name);
  execute format('alter table silver.%I enable row level security',v_keywords_name);
  execute format('alter table silver.%I enable row level security',v_blocks_name);

  execute format('create policy %I on silver.%I for select to anonymous,authenticated using (true)',v_scope||'_config_public_read',v_config_name);
  execute format('create policy %I on silver.%I for update to authenticated using (silver.can_manage_scope(%L)) with check (silver.can_manage_scope(%L))',v_scope||'_config_scope_update',v_config_name,v_scope,v_scope);
  execute format('create policy %I on silver.%I for select to anonymous,authenticated using (true)',v_scope||'_galaxy_public_read',v_galaxy_name);
  execute format('create policy %I on silver.%I for update to authenticated using (silver.can_manage_scope(%L)) with check (silver.can_manage_scope(%L))',v_scope||'_galaxy_scope_update',v_galaxy_name,v_scope,v_scope);
  execute format('create policy %I on silver.%I for select to anonymous,authenticated using (true)',v_scope||'_media_public_read',v_media_name);
  execute format('create policy %I on silver.%I for update to authenticated using (silver.can_manage_scope(%L)) with check (silver.can_manage_scope(%L))',v_scope||'_media_scope_update',v_media_name,v_scope,v_scope);
  execute format('create policy %I on silver.%I for select to anonymous,authenticated using (true)',v_scope||'_time_public_read',v_time_name);
  execute format('create policy %I on silver.%I for all to authenticated using (silver.can_manage_scope(%L)) with check (silver.can_manage_scope(%L))',v_scope||'_time_scope_all',v_time_name,v_scope,v_scope);
  execute format('create policy %I on silver.%I for all to authenticated using (silver.can_manage_scope(%L)) with check (silver.can_manage_scope(%L))',v_scope||'_keywords_scope_all',v_keywords_name,v_scope,v_scope);
  execute format('create policy %I on silver.%I for select to anonymous,authenticated using (true)',v_scope||'_blocks_public_read',v_blocks_name);
  execute format('create policy %I on silver.%I for all to authenticated using (silver.can_manage_scope(%L)) with check (silver.can_manage_scope(%L))',v_scope||'_blocks_scope_all',v_blocks_name,v_scope,v_scope);

  execute format('grant select on silver.%I to anonymous,authenticated',v_config_name);
  execute format('grant update on silver.%I to authenticated',v_config_name);
  execute format('grant select on silver.%I to anonymous,authenticated',v_galaxy_name);
  execute format('grant update on silver.%I to authenticated',v_galaxy_name);
  execute format('grant select on silver.%I to anonymous,authenticated',v_media_name);
  execute format('grant update on silver.%I to authenticated',v_media_name);
  execute format('grant select on silver.%I to anonymous,authenticated',v_time_name);
  execute format('grant select,insert,update,delete on silver.%I to authenticated',v_keywords_name);
  execute format('grant select on silver.%I to anonymous,authenticated',v_blocks_name);
  execute format('grant insert,update,delete on silver.%I to authenticated',v_blocks_name);
  v_keyword_sequence := pg_get_serial_sequence(format('silver.%I',v_keywords_name),'keyword_id');
  if v_keyword_sequence is not null then execute format('grant usage,select on sequence %s to authenticated',v_keyword_sequence); end if;

  insert into silver.manage(id,email,role,galaxy,time,birthday)
  values(v_scope,v_email,'scope','galaxy','time',p_birthday);

  select coalesce(max(sort_order),0)+10 into v_sort_order from silver.scope_registry where parent_scope_id=v_parent;
  insert into silver.scope_registry(scope_id,display_name,scope_kind,domain,directory,parent_scope_id,active,sort_order)
  values(v_scope,v_name,'scope',nullif(v_domain,''),nullif(v_directory,''),v_parent,true,v_sort_order);

  if p_copy_keywords then
    select current_keyword_class_id into v_source_class from silver.lo3rwang where id='lo3rwang';
    if v_source_class is null then raise exception 'lo3rwang current Keyword Class is not configured'; end if;
    v_new_class := gen_random_uuid();
    insert into silver.keyword_classes(class_id,scope_id) values(v_new_class,v_scope);
    execute format(
      'insert into silver.%I
        (class_id,group_name,item_no,item_name,principle,keywords,order_no,class_name,class_group,class_enable)
       select $1,group_name,item_no,item_name,principle,keywords,order_no,class_name,class_group,class_enable
       from silver.lo3rwang_keywords where class_id=$2 order by order_no,item_no',
      v_keywords_name
    ) using v_new_class,v_source_class;
    get diagnostics v_keyword_count = row_count;
    if v_keyword_count<>66 then raise exception 'Rune66 default copy expected 66 rows, copied %',v_keyword_count; end if;
  end if;

  execute format(
    'insert into silver.%I
      (id,email,display_name,search_intro,search_aliases,theme,locale,search_able,statistics_able,culture_able,
       keyword_min_chars,keyword_min_documents,current_keyword_class_id,
       keyword_class_share_enabled,keyword_document_count,keyword_meta,staticstime,updated_at)
     values($1,$2,$3,'''',array[$1,$3]::text[],$4,''zh-Hant'',true,true,true,32,100,$5,false,0,''{}''::jsonb,null,now())',
    v_config_name
  ) using v_scope,v_email,v_name,v_theme,v_new_class;

  execute format(
    'insert into silver.%I(block_page,block_title,block_text,block_order)
     select p.page,'''','''',o.n
     from (values (''home''),(''governance'')) as p(page)
     cross join generate_series(1,4) as o(n)',
    v_blocks_name
  );

  return jsonb_build_object(
    'scope_id',v_scope,'display_name',v_name,'parent_scope_id',v_parent,
    'route_mode',case when v_domain<>'' then 'domain' else 'directory' end,
    'route_value',case when v_domain<>'' then v_domain else v_directory end,
    'keyword_rows',v_keyword_count,'keyword_class_id',v_new_class
  );
end;
$function$;

revoke all on function api.provision_scope(text,text,text,date,text,text,text,text,boolean) from public;
revoke all on function api.provision_scope(text,text,text,date,text,text,text,text,boolean) from anonymous;
grant execute on function api.provision_scope(text,text,text,date,text,text,text,text,boolean) to authenticated;

create or replace function api.apply_keyword_classification(p_scope_id text,p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_scope text := lower(btrim(coalesce(p_scope_id,'')));
  v_mode text := lower(coalesce(p_rows->>'mode',''));
  v_rows jsonb := p_rows->'rows';
  v_meta jsonb := coalesce(p_rows->'meta','{}'::jsonb);
  v_config regclass;
  v_galaxy regclass;
  v_galaxy_suffix text;
  v_affected integer := 0;
  v_document_count integer := 0;
  v_expected integer := 0;
  v_meta_class_id text := '';
begin
  if v_scope !~ '^[a-z][a-z0-9]{0,14}$' then raise exception 'invalid Scope ID'; end if;
  if not silver.can_manage_scope(v_scope) then raise exception 'Scope management permission denied'; end if;
  select coalesce(nullif(galaxy,''),'galaxy') into v_galaxy_suffix
    from silver.manage where id=v_scope order by case when role='admin' then 0 else 1 end,email limit 1;
  if v_galaxy_suffix is null then raise exception 'Scope mapping not found'; end if;
  v_config := to_regclass(format('silver.%I',v_scope));
  v_galaxy := to_regclass(format('silver.%I',v_scope||'_'||v_galaxy_suffix));
  if v_config is null or v_galaxy is null then raise exception 'Scope keyword classification relations are missing'; end if;

  if v_mode='begin' then
    execute format('update %s set class_id=null,group_lists=''false''::jsonb',v_galaxy);
    get diagnostics v_affected = row_count;
    execute format('update %s set staticstime=null,keyword_document_count=0,keyword_meta=''{}''::jsonb,updated_at=now() where id=$1',v_config) using v_scope;
    if not found then raise exception 'Scope config row not found'; end if;
    return v_affected;
  end if;

  if v_mode='chunk' then
    if jsonb_typeof(v_rows)<>'array' then raise exception 'rows must be an array'; end if;
    v_expected := jsonb_array_length(v_rows);
    execute format(
      'with payload as (
         select upper(btrim(x.uid))::character(8) as uid,x.class_id,coalesce(x.group_lists,''{}''::jsonb) as group_lists
         from jsonb_to_recordset($1) as x(uid text,class_id smallint,group_lists jsonb)
         where btrim(coalesce(x.uid,''''))
       )
       update %s as g set class_id=p.class_id,group_lists=p.group_lists from payload p where g.uid=p.uid',
      v_galaxy
    ) using v_rows;
    get diagnostics v_affected = row_count;
    if v_affected<>v_expected then raise exception 'keyword classification chunk incomplete: expected %, affected %',v_expected,v_affected; end if;
    return v_affected;
  end if;

  if v_mode='finalize' then
    v_meta_class_id := coalesce(v_meta->>'class_id','');
    if v_meta_class_id='' then raise exception 'classification metadata class_id is required'; end if;
    execute format('select count(*) from %s where id=$1 and current_keyword_class_id::text=$2',v_config)
      into v_expected using v_scope,v_meta_class_id;
    if v_expected<>1 then raise exception 'current keyword Class changed before finalize'; end if;
    execute format('select count(*) from %s where group_lists<>''false''::jsonb',v_galaxy) into v_document_count;
    execute format('update %s set staticstime=now(),keyword_document_count=$2,keyword_meta=$3,updated_at=now() where id=$1',v_config)
      using v_scope,v_document_count,v_meta;
    if not found then raise exception 'Scope config row not found'; end if;
    return v_document_count;
  end if;
  raise exception 'unsupported keyword classification mode';
end;
$function$;

create or replace function api.apply_keyword_classification(p_rows jsonb)
returns integer language sql set search_path = ''
as $function$ select api.apply_keyword_classification('lo3rwang',p_rows) $function$;

revoke all on function api.apply_keyword_classification(text,jsonb) from public;
revoke all on function api.apply_keyword_classification(text,jsonb) from anonymous;
grant execute on function api.apply_keyword_classification(text,jsonb) to authenticated;
revoke all on function api.apply_keyword_classification(jsonb) from public;
revoke all on function api.apply_keyword_classification(jsonb) from anonymous;
grant execute on function api.apply_keyword_classification(jsonb) to authenticated;
