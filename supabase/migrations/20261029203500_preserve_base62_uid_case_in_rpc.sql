-- Keep Base62 article/media UIDs case-sensitive across RPC writes and comparisons.
-- No UID case conversion or uppercase-only UID validation; original PK semantics remain.
-- Only the three affected functions are replaced; no data updates or constraint changes.

CREATE OR REPLACE FUNCTION api.apply_keyword_classification(p_scope_id text, p_rows jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  select coalesce(nullif(galaxy_table,''),'galaxy') into v_galaxy_suffix
    from silver.manage where id=v_scope;
  if v_galaxy_suffix is null then raise exception 'Scope mapping not found'; end if;
  v_config := to_regclass(format('silver.%I',v_scope));
  v_galaxy := to_regclass(format('silver.%I',v_scope||'_'||v_galaxy_suffix));
  if v_config is null or v_galaxy is null then raise exception 'Scope keyword classification relations are missing'; end if;

  if v_mode='begin' then
    -- PostgreSQL safe-update requires a WHERE clause. Avoid touching already cleared rows.
    execute format('update %s set class_id=null,group_lists=''false'' where class_id is not null or group_lists is distinct from ''false''',v_galaxy);
    get diagnostics v_affected = row_count;
    execute format('update %s set staticstime=null,keyword_meta=''{}''::jsonb,updated_at=now() where id=$1',v_config) using v_scope;
    if not found then raise exception 'Scope config row not found'; end if;
    return v_affected;
  end if;

  if v_mode='chunk' then
    if jsonb_typeof(v_rows)<>'array' then raise exception 'rows must be an array'; end if;
    v_expected := jsonb_array_length(v_rows);
    execute format(
      'with payload as (
         select x.uid::character(8) as uid,x.class_id,coalesce(x.group_lists,'''') as group_lists
         from jsonb_to_recordset($1) as x(uid text,class_id smallint,group_lists text)
         where btrim(coalesce(x.uid,'''')) <> ''''
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
    execute format('select count(*) from %s where group_lists<>''false''',v_galaxy) into v_document_count;
    execute format('update %s set staticstime=now(),keyword_meta=$2,updated_at=now() where id=$1',v_config)
      using v_scope,v_meta;
    if not found then raise exception 'Scope config row not found'; end if;
    return v_document_count;
  end if;
  raise exception 'unsupported keyword classification mode';
end;
$function$;

CREATE OR REPLACE FUNCTION silver.apply_keyword_classification(p_scope_id text, p_rows jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_scope text := lower(btrim(coalesce(p_scope_id,'')));
  v_mode text := lower(coalesce(p_rows->>'mode',''));
  v_rows jsonb := p_rows->'rows';
  v_uids jsonb := p_rows->'uids';
  v_meta jsonb := coalesce(p_rows->'meta','{}'::jsonb);
  v_config regclass;
  v_galaxy regclass;
  v_galaxy_suffix text;
  v_affected integer := 0;
  v_matched integer := 0;
  v_document_count integer := 0;
  v_expected integer := 0;
  v_meta_class_id text := '';
begin
  if v_scope !~ '^[a-z][a-z0-9]{0,14}$' then raise exception 'invalid Scope ID'; end if;
  if not silver.can_manage_scope(v_scope) then raise exception 'Scope management permission denied'; end if;
  select coalesce(nullif(galaxy_table,''),'galaxy') into v_galaxy_suffix
    from silver.manage where id=v_scope;
  if v_galaxy_suffix is null then raise exception 'Scope mapping not found'; end if;
  v_config := to_regclass(format('silver.%I',v_scope));
  v_galaxy := to_regclass(format('silver.%I',v_scope||'_'||v_galaxy_suffix));
  if v_config is null or v_galaxy is null then raise exception 'Scope keyword classification relations are missing'; end if;

  if v_mode='begin' then
    -- Used to null out staticstime here ("mark the run as in-progress"),
    -- which meant a run that started but never reached 'finalize' (crash,
    -- cancel, network drop) left the scope looking like it had never been
    -- analyzed at all, even though every article still held its last
    -- successful classification (chunk writes are diff-only; a
    -- not-yet-finalized run never blanket-clears anything). staticstime
    -- must only ever move on a CONFIRMED success -- see 'finalize' -- so
    -- this is now a no-op permission/existence check only: a failed or
    -- interrupted run leaves staticstime, keyword_document_count and
    -- keyword_meta exactly as they were after the last successful run.
    if not exists(select 1 from (select 1) as _ ) then end if; -- unreachable, keeps plpgsql happy with no-op branch
    return 0;
  end if;

  if v_mode='reset' then
    -- Explicit, manually-triggered full wipe -- the old 'begin' behavior.
    -- Use when the keyword library changed enough that a clean slate is wanted.
    execute format('update %s set class_id=null,group_lists=''false'' where class_id is not null or group_lists is distinct from ''false''',v_galaxy);
    get diagnostics v_affected = row_count;
    execute format('update %s set staticstime=null,keyword_meta=''{}''::jsonb,updated_at=now() where id=$1',v_config) using v_scope;
    if not found then raise exception 'Scope config row not found'; end if;
    return v_affected;
  end if;

  if v_mode='chunk' then
    if jsonb_typeof(v_rows)<>'array' then raise exception 'rows must be an array'; end if;
    v_expected := jsonb_array_length(v_rows);
    execute format(
      'with payload as (
         select x.uid::character(8) as uid,x.class_id,coalesce(x.group_lists,'''') as group_lists
         from jsonb_to_recordset($1) as x(uid text,class_id smallint,group_lists text)
         where btrim(coalesce(x.uid,'''')) <> ''''
       )
       select count(*) from %s as g join payload p on g.uid=p.uid',
      v_galaxy
    ) using v_rows into v_matched;
    if v_matched<>v_expected then raise exception 'keyword classification chunk incomplete: expected %, matched %',v_expected,v_matched; end if;
    execute format(
      'with payload as (
         select x.uid::character(8) as uid,x.class_id,coalesce(x.group_lists,'''') as group_lists
         from jsonb_to_recordset($1) as x(uid text,class_id smallint,group_lists text)
         where btrim(coalesce(x.uid,'''')) <> ''''
       )
       update %s as g set class_id=p.class_id,group_lists=p.group_lists
       from payload p
       where g.uid=p.uid
         and (g.class_id is distinct from p.class_id or g.group_lists is distinct from p.group_lists)',
      v_galaxy
    ) using v_rows;
    get diagnostics v_affected = row_count;
    return v_affected;
  end if;

  if v_mode='sync' then
    if p_rows->>'scopeBased'='true' then
      -- Equivalent to the caller's eligible UID population:
      -- all rows whose statistics_able IS TRUE are retained. Do not send
      -- ~144k UIDs to discover which rows are no longer statistics eligible.
      -- The UPDATE only touches rows that actually require clearing.
      execute format(
        'update %s as g set class_id=null,group_lists=''false''
         where g.statistics_able is distinct from true
           and (g.class_id is not null or g.group_lists is distinct from ''false'')',
        v_galaxy
      );
      get diagnostics v_affected = row_count;
      return v_affected;
    end if;
    -- Keep the old UID sync contract for older already-open clients.
    if jsonb_typeof(v_uids)<>'array' then raise exception 'uids must be an array'; end if;
    execute format(
      'with eligible as (
         select value::character(8) as uid
         from jsonb_array_elements_text($1) as value
         where btrim(coalesce(value,'''')) <> ''''
       )
       update %s as g set class_id=null,group_lists=''false''
       where (g.class_id is not null or g.group_lists is distinct from ''false'')
         and not exists (select 1 from eligible e where e.uid=g.uid)',
      v_galaxy
    ) using v_uids;
    get diagnostics v_affected = row_count;
    return v_affected;
  end if;

  if v_mode='finalize' then
    v_meta_class_id := coalesce(v_meta->>'class_id','');
    if v_meta_class_id='' then raise exception 'classification metadata class_id is required'; end if;
    execute format('select count(*) from %s where id=$1 and current_keyword_class_id::text=$2',v_config)
      into v_expected using v_scope,v_meta_class_id;
    if v_expected<>1 then raise exception 'current keyword Class changed before finalize'; end if;
    execute format('select count(*) from %s where group_lists<>''false''',v_galaxy) into v_document_count;
    execute format('update %s set staticstime=now(),keyword_meta=$2,updated_at=now() where id=$1',v_config)
      using v_scope,v_meta;
    if not found then raise exception 'Scope config row not found'; end if;
    return v_document_count;
  end if;
  raise exception 'unsupported keyword classification mode';
end;
$function$;

CREATE OR REPLACE FUNCTION silver.save_archive_media_exif(p_scope_id text, p_rows jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_scope text := lower(btrim(coalesce(p_scope_id,'')));
  v_suffix text;
  v_media regclass;
  v_row jsonb;
  v_id varchar(8);
  v_lat double precision;
  v_lng double precision;
  v_time text;
  v_found boolean;
  v_count integer := 0;
begin
  if v_scope !~ '^[a-z][a-z0-9]{0,14}$' then raise exception 'invalid Scope ID'; end if;
  if not silver.can_manage_scope(v_scope) then raise exception 'Scope management permission denied'; end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows)>10000 then
    raise exception 'EXIF rows must be a JSON array with at most 10000 entries';
  end if;
  select coalesce(nullif(galaxy_table,''),'galaxy') into v_suffix
    from silver.manage where id=v_scope;
  if v_suffix is null then raise exception 'Scope mapping not found'; end if;
  v_media := to_regclass(format('silver.%I',v_scope||'_'||v_suffix||'_media'));
  if v_media is null then raise exception 'Scope Galaxy Media table not found'; end if;
  for v_row in select value from jsonb_array_elements(p_rows) loop
    v_id := nullif(v_row->>'media_uid','');
    v_lat := nullif(v_row->>'latitude','')::double precision;
    v_lng := nullif(v_row->>'longitude','')::double precision;
    v_time := nullif(btrim(coalesce(v_row->>'camera_local_time','')),'');
    if nullif(v_row->>'archive_id','') is null or nullif(v_row->>'entry_path','') is null then
      raise exception 'EXIF archive identity required';
    end if;
    if length(v_row->>'archive_id')>400 or length(v_row->>'entry_path')>2048 then
      raise exception 'EXIF archive path exceeds limit';
    end if;
    if (v_lat is null) <> (v_lng is null) or
      (v_lat is not null and (v_lat not between -90 and 90 or v_lng not between -180 and 180)) then
      raise exception 'EXIF coordinates invalid';
    end if;
    if v_lat is null and v_time is null then continue; end if;
    if v_id is not null then
      execute format('select exists(select 1 from %s where uid=$1)',v_media)
        using v_id into v_found;
      if not v_found then raise exception 'EXIF media UID is not registered for this Scope'; end if;
    end if;
    insert into silver.archive_media_exif
      (scope_id,archive_id,entry_path,media_uid,platform,latitude,longitude,camera_local_time)
    values
      (v_scope,v_row->>'archive_id',v_row->>'entry_path',v_id,
       nullif(left(coalesce(v_row->>'platform',''),32),''),
       v_lat,v_lng,v_time)
    on conflict(scope_id,archive_id,entry_path)
      do update set media_uid=excluded.media_uid,
        platform=coalesce(excluded.platform,silver.archive_media_exif.platform),
        latitude=coalesce(excluded.latitude,silver.archive_media_exif.latitude),
        longitude=coalesce(excluded.longitude,silver.archive_media_exif.longitude),
        camera_local_time=coalesce(excluded.camera_local_time,silver.archive_media_exif.camera_local_time),
        imported_at=now();
    v_count := v_count+1;
  end loop;
  return v_count;
end
$function$;
