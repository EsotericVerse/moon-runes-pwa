-- Replace every legacy SQL function that depends on class_id/item_no.
-- Do not run the subsequent DROP COLUMN migration until the application
-- and the on-device local database no longer query these columns.
CREATE OR REPLACE FUNCTION api.copy_rune66_keyword_class(p_scope_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $fn$
DECLARE
  v_scope text := lower(btrim(coalesce(p_scope_id,'')));
  v_target regclass;
  v_class_uid varchar(4);
  v_name text;
  v_count integer;
BEGIN
  IF v_scope !~ '^[a-z][a-z0-9]{0,14}$' THEN RAISE EXCEPTION 'Invalid Scope ID'; END IF;
  IF NOT silver.can_manage_scope(v_scope) THEN RAISE EXCEPTION 'Permission denied'; END IF;
  v_target:=to_regclass(format('silver.%I_keywords',v_scope));
  IF v_target IS NULL THEN RAISE EXCEPTION 'Scope Keywords not found'; END IF;
  INSERT INTO silver.keyword_classes(scope_id) VALUES(v_scope)
    RETURNING class_uid INTO v_class_uid;
  v_name:='符文66副本-'||v_class_uid;
  EXECUTE format($sql$
    INSERT INTO %s(class_uid,group_name,class_name,class_group,class_enable,
      item_name,principle,keywords,order_no,uidlist)
    SELECT $1,$2,$2,class_group,class_enable,item_name,principle,
      keywords,order_no,'[]'::jsonb
    FROM silver.lo3rwang_keywords
    WHERE class_name='符文66'
  $sql$,v_target) USING v_class_uid,v_name;
  GET DIAGNOSTICS v_count=ROW_COUNT;
  IF v_count<1 THEN RAISE EXCEPTION 'Source Rune66 Class contains no Items'; END IF;
  RETURN jsonb_build_object('class_uid',v_class_uid,'class_name',v_name,'count',v_count);
END;
$fn$;
CREATE OR REPLACE FUNCTION api.read_keyword_class_by_uid(p_scope_id text,p_class_uid varchar(4))
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $fn$
DECLARE
  v_scope text:=lower(btrim(coalesce(p_scope_id,'')));
  v_config regclass;
  v_keywords regclass;
  v_current text;
  v_share boolean:=false;
  v_result jsonb;
BEGIN
  IF v_scope !~ '^[a-z][a-z0-9]{0,14}$' THEN RETURN null; END IF;
  IF NOT EXISTS(SELECT 1 FROM silver.keyword_classes
    WHERE scope_id=v_scope AND class_uid=p_class_uid) THEN RETURN null; END IF;
  v_config:=to_regclass(format('silver.%I',v_scope));
  v_keywords:=to_regclass(format('silver.%I_keywords',v_scope));
  IF v_config IS NULL OR v_keywords IS NULL THEN RETURN null; END IF;
  IF NOT silver.can_manage_scope(v_scope) THEN
    EXECUTE format('SELECT current_keyword_class_uid,coalesce(keyword_class_share_enabled,false) FROM %s WHERE id=$1',v_config)
      INTO v_current,v_share USING v_scope;
    IF NOT (v_share AND v_current=p_class_uid) THEN RETURN null; END IF;
  END IF;
  EXECUTE format(
    'SELECT coalesce(jsonb_agg(to_jsonb(k) - ''uidlist'' ORDER BY k.order_no,k.keyword_id),''[]''::jsonb) FROM %s k WHERE class_uid=$1',
    v_keywords
  ) INTO v_result USING p_class_uid;
  RETURN coalesce(v_result,'[]'::jsonb);
END;
$fn$;
REVOKE ALL ON FUNCTION api.read_keyword_class_by_uid(text,varchar) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION api.read_keyword_class_by_uid(text,varchar) TO anon,authenticated;
CREATE OR REPLACE FUNCTION silver.read_keyword_class_by_uid(p_scope_id text,p_class_uid varchar(4))
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $fn$ SELECT api.read_keyword_class_by_uid(p_scope_id,p_class_uid); $fn$;
REVOKE ALL ON FUNCTION silver.read_keyword_class_by_uid(text,varchar) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION silver.read_keyword_class_by_uid(text,varchar) TO anon,authenticated;

CREATE OR REPLACE FUNCTION silver.read_music_style_tree()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $fn$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'class_name',k.class_name,'class_group',k.class_group,
    'item_name',k.item_name,'keywords',k.keywords
  ) ORDER BY k.class_name,k.order_no,k.keyword_id),'[]'::jsonb)
  FROM silver.lo3rwang_keywords k
  JOIN silver.keyword_classes c ON c.class_uid=k.class_uid AND c.scope_id='lo3rwang'
  WHERE lower(k.class_name)=ANY(ARRAY[
    'pop','hip-hop','vocal','rock','electronic','jazz','soul','blues',
    'folk','classical','ambient','dance','r&b','metal','reggae',
    'latin','country','funk','disco','orchestral','experimental',
    'world','punk','house','techno','trance','garage'
  ]::text[])
  AND k.class_enable IS DISTINCT FROM false;
$fn$;
CREATE OR REPLACE FUNCTION api.provision_scope(p_scope_id text, p_display_name text, p_email text, p_birthday date DEFAULT NULL::date, p_domain text DEFAULT NULL::text, p_directory text DEFAULT NULL::text, p_parent_scope_id text DEFAULT 'loc'::text, p_theme text DEFAULT 'system-default'::text, p_copy_keywords boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_scope text := lower(btrim(coalesce(p_scope_id,'')));
  v_name text := btrim(coalesce(p_display_name,''));
  v_email text := lower(btrim(coalesce(p_email,'')));
  v_domain text := lower(btrim(coalesce(p_domain,'')));
  v_directory text := lower(btrim(coalesce(p_directory,'')));
  v_parent text := lower(btrim(coalesce(p_parent_scope_id,'loc')));
  v_theme text := lower(btrim(coalesce(p_theme,'system-default')));
  v_config_name text;
  v_galaxy_name text;
  v_media_name text;
  v_time_name text;
  v_keywords_name text;
  v_blocks_name text;
  v_source_class text;
  v_new_class text;
  v_keyword_count integer := 0;
  v_keyword_sequence text;
  v_sort_order integer := 0;
begin
  if not silver.can_manage_global() then raise exception 'global management permission denied'; end if;
  if v_scope !~ '^[a-z][a-z0-9]{0,14}$' then raise exception 'Scope ID must be 1-15 lowercase alphanumeric characters and start with a letter'; end if;
  if v_name='' then raise exception 'display name is required'; end if;
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'email format is invalid'; end if;
  if v_theme<>'system-default' and v_theme !~ '^theme-[1-8]$' then raise exception 'theme must be theme-1 through theme-8'; end if;
  if (v_domain='') = (v_directory='') then raise exception 'exactly one of domain or directory is required'; end if;
  if v_domain<>'' and v_domain !~ '^[a-z0-9][a-z0-9.-]*[a-z0-9]$' then raise exception 'domain format is invalid'; end if;
  if v_directory<>'' then
    v_directory := '/'||btrim(v_directory,'/');
    if btrim(v_directory,'/') !~ '^[a-z0-9][a-z0-9/_-]*$' then raise exception 'directory format is invalid'; end if;
  end if;
  if v_parent='' then v_parent := 'loc'; end if;
  if not exists(select 1 from silver.manage where id=v_parent and manage_role='group' and active)
  then raise exception 'parent Scope Group does not exist or is inactive'; end if;
  if exists(select 1 from silver.manage where id=v_scope)
  then raise exception 'Scope already exists'; end if;
  if v_domain<>'' and exists(select 1 from silver.manage where lower(domain)=v_domain)
  then raise exception 'domain already belongs to another Scope'; end if;
  if v_directory<>'' and exists(select 1 from silver.manage where lower(directory)=v_directory)
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
  execute format('create trigger sync_scope_display_name after insert or update of display_name on silver.%I for each row execute function silver.sync_scope_config_display_name()',v_config_name);
  execute format('alter table silver.%I drop column if exists home_blocks',v_config_name);
  execute format('alter table silver.%I drop column if exists governance_blocks',v_config_name);
  execute format('create table silver.%I (like silver.lo3rwang_blocks including all)',v_blocks_name);
  execute format('create table silver.%I (like silver.lo3rwang_galaxy including all)',v_galaxy_name);
  execute format('create table silver.%I (like silver.lo3rwang_galaxy_media including all)',v_media_name);
  execute format('create table silver.%I (like silver.lo3rwang_time including all)',v_time_name);
  execute format('create table silver.%I (like silver.lo3rwang_keywords including all)',v_keywords_name);

  
  execute format('alter table silver.%I add constraint %I foreign key (current_keyword_class_uid) references silver.keyword_classes(class_uid)',v_config_name,v_scope||'_current_keyword_class_fk');
  execute format('alter table silver.%I add constraint %I foreign key (class_uid) references silver.keyword_classes(class_uid)',v_keywords_name,v_scope||'_keywords_class_fk');

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

  select coalesce(max(sort_order),0)+10 into v_sort_order from silver.manage where parent_scope_id=v_parent;
  insert into silver.manage(id,display_name,domain,directory,parent_scope_id,active,sort_order,email,manage_role,birthday)
  values(v_scope,v_name,nullif(v_domain,''),nullif(v_directory,''),v_parent,true,v_sort_order,v_email,'scope',p_birthday);

  if p_copy_keywords then
    select current_keyword_class_uid into v_source_class from silver.lo3rwang where id='lo3rwang';
    if v_source_class is null then raise exception 'lo3rwang current Keyword Class is not configured'; end if;
    insert into silver.keyword_classes(scope_id) values(v_scope) returning class_uid into v_new_class;
    execute format(
      'insert into silver.%I
        (class_uid,group_name,item_name,principle,keywords,order_no,class_name,class_group,class_enable,uidlist)
       select $1,group_name,item_name,principle,keywords,order_no,class_name,class_group,class_enable,'[]'::jsonb
       from silver.lo3rwang_keywords where class_uid=$2 order by order_no,keyword_id',
      v_keywords_name
    ) using v_new_class,v_source_class;
    get diagnostics v_keyword_count = row_count;
    if v_keyword_count<1 then raise exception 'Default Keyword Class contains no Items'; end if;
  end if;

  execute format(
    'insert into silver.%I
      (id,email,display_name,search_intro,search_aliases,theme,locale,search_able,statistics_able,culture_able,
       keyword_min_chars,keyword_min_documents,current_keyword_class_uid,
       keyword_class_share_enabled,keyword_document_count,keyword_meta,staticstime,updated_at)
     values($1,$2,$3,'''',array[$1,$3]::text[],$4,''zh-Hant'',true,true,true,32,100,$5,false,0,''{}''::jsonb,null,now())',
    v_config_name
  ) using v_scope,v_email,v_name,v_theme,v_new_class;

  perform pg_catalog.pg_notify('pgrst','reload schema');

  return jsonb_build_object(
    'scope_id',v_scope,'display_name',v_name,'parent_scope_id',v_parent,
    'route_mode',case when v_domain<>'' then 'domain' else 'directory' end,
    'route_value',case when v_domain<>'' then v_domain else v_directory end,
    'keyword_rows',v_keyword_count,'keyword_class_uid',v_new_class
  );
end;
$function$

