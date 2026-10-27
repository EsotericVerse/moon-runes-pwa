-- Private image metadata from on-device ZIP scans; no image bytes are persisted.
-- Public silver.<scope>_galaxy_media retains URL and article links only.
create table if not exists silver.archive_media_exif (
  scope_id text not null,
  archive_id text not null,
  entry_path text not null,
  media_id uuid not null,
  platform text,
  latitude double precision,
  longitude double precision,
  camera_local_time text,
  imported_at timestamptz not null default now(),
  primary key (scope_id, archive_id, entry_path),
  constraint archive_media_exif_coordinates_valid check (
    (latitude is null and longitude is null) or
    (latitude between -90 and 90 and longitude between -180 and 180)
  ),
  constraint archive_media_exif_nonempty check (latitude is not null or nullif(camera_local_time,'') is not null)
);
create index if not exists archive_media_exif_media_id_idx
  on silver.archive_media_exif(media_id);
alter table silver.archive_media_exif enable row level security;
revoke all on silver.archive_media_exif from anon, authenticated;
grant select on silver.archive_media_exif to authenticated;
drop policy if exists archive_media_exif_owner_read on silver.archive_media_exif;
create policy archive_media_exif_owner_read on silver.archive_media_exif
  for select to authenticated using (silver.can_manage_scope(scope_id));

create or replace function silver.save_archive_media_exif(p_scope_id text,p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare
  v_scope text := lower(btrim(coalesce(p_scope_id,'')));
  v_suffix text;
  v_media regclass;
  v_row jsonb;
  v_id uuid;
  v_lat double precision;
  v_lng double precision;
  v_time text;
  v_found boolean;
  v_count integer := 0;
begin
  if v_scope !~ '^[a-z][a-z0-9]{0,14}$' then raise exception 'invalid Scope ID'; end if;
  if not silver.can_manage_scope(v_scope) then raise exception 'Scope management permission denied'; end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows)>200 then
    raise exception 'EXIF rows must be a JSON array with at most 200 entries';
  end if;
  select coalesce(nullif(galaxy_table,''),'galaxy') into v_suffix
    from silver.manage where id=v_scope;
  if v_suffix is null then raise exception 'Scope mapping not found'; end if;
  v_media := to_regclass(format('silver.%I',v_scope||'_'||v_suffix||'_media'));
  if v_media is null then raise exception 'Scope Galaxy Media table not found'; end if;
  for v_row in select value from jsonb_array_elements(p_rows) loop
    v_id := nullif(v_row->>'media_id','')::uuid;
    v_lat := nullif(v_row->>'latitude','')::double precision;
    v_lng := nullif(v_row->>'longitude','')::double precision;
    v_time := nullif(btrim(coalesce(v_row->>'camera_local_time','')),'');
    if v_id is null then raise exception 'EXIF media_id required'; end if;
    if nullif(v_row->>'archive_id','') is null or
       nullif(v_row->>'entry_path','') is null then
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
    execute format('select exists(select 1 from %s where media_id=$1)',v_media)
      using v_id into v_found;
    if not v_found then raise exception 'EXIF media_id is not registered for this Scope'; end if;
    insert into silver.archive_media_exif
      (scope_id,archive_id,entry_path,media_id,platform,latitude,longitude,camera_local_time)
    values
      (v_scope,v_row->>'archive_id',v_row->>'entry_path',v_id,
       nullif(left(coalesce(v_row->>'platform',''),32),''),
       v_lat,v_lng,v_time)
    on conflict (scope_id,archive_id,entry_path)
      do update set media_id=excluded.media_id,
        platform=coalesce(excluded.platform,silver.archive_media_exif.platform),
        latitude=coalesce(excluded.latitude,silver.archive_media_exif.latitude),
        longitude=coalesce(excluded.longitude,silver.archive_media_exif.longitude),
        camera_local_time=coalesce(excluded.camera_local_time,silver.archive_media_exif.camera_local_time),
        imported_at=now();
    v_count := v_count+1;
  end loop;
  return v_count;
end;
$$;
revoke all on function silver.save_archive_media_exif(text,jsonb) from public;
grant execute on function silver.save_archive_media_exif(text,jsonb) to authenticated;
