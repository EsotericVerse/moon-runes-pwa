-- Convert article-to-media links without altering the independent media-to-article galaxy_link.
-- This is a single transaction (migration); validation failure rolls everything back.
do $$
begin
  if exists(select 1 from silver.lo3rwang_galaxy_media m
            left join loc_media_migration.galaxy_media_uid_map_20261028 old
              on old.scope_id='lo3rwang' and old.old_media_id=m.media_id
            where old.uid is distinct from m.uid)
     or exists(select 1 from silver.lrunes_galaxy_media m
            left join loc_media_migration.galaxy_media_uid_map_20261028 old
              on old.scope_id='lrunes' and old.old_media_id=m.media_id
            where old.uid is distinct from m.uid) then
    raise exception 'Old-to-new media UID map incomplete or mismatched';
  end if;
  if exists(select 1 from silver.lo3rwang_galaxy g
    cross join lateral unnest(g.media_link) l(id)
    left join silver.lo3rwang_galaxy_media m on m.media_id=l.id
    where m.uid is null)
  or exists(select 1 from silver.lrunes_galaxy g
    cross join lateral unnest(g.media_link) l(id)
    left join silver.lrunes_galaxy_media m on m.media_id=l.id
    where m.uid is null) then
    raise exception 'Article media_link has unresolvable media references';
  end if;
end
$$;

alter table silver.lo3rwang_galaxy add column media_link_uid varchar(8)[];
alter table silver.lrunes_galaxy add column media_link_uid varchar(8)[];

update silver.lo3rwang_galaxy g
set media_link_uid=coalesce((
  select array_agg(m.uid order by u.ord)
  from unnest(g.media_link) with ordinality u(old_id,ord)
  join silver.lo3rwang_galaxy_media m on m.media_id=u.old_id
),array[]::varchar(8)[])
where g.media_link is not null;

update silver.lrunes_galaxy g
set media_link_uid=coalesce((
  select array_agg(m.uid order by u.ord)
  from unnest(g.media_link) with ordinality u(old_id,ord)
  join silver.lrunes_galaxy_media m on m.media_id=u.old_id
),array[]::varchar(8)[])
where g.media_link is not null;

do $$
begin
  if exists(select 1 from silver.lo3rwang_galaxy
    where (media_link is null) is distinct from (media_link_uid is null)
       or cardinality(media_link) is distinct from cardinality(media_link_uid))
    or exists(select 1 from silver.lrunes_galaxy
    where (media_link is null) is distinct from (media_link_uid is null)
       or cardinality(media_link) is distinct from cardinality(media_link_uid)) then
    raise exception 'Article media linkage size or nullability changed';
  end if;
end
$$;

alter table silver.lo3rwang_galaxy drop column media_link;
alter table silver.lo3rwang_galaxy rename column media_link_uid to media_link;
alter table silver.lrunes_galaxy drop column media_link;
alter table silver.lrunes_galaxy rename column media_link_uid to media_link;

-- Archive EXIF is private and keeps only the new short media key.
alter table silver.archive_media_exif add column media_uid varchar(8);
update silver.archive_media_exif e
set media_uid=m.uid
from loc_media_migration.galaxy_media_uid_map_20261028 m
where e.media_id=m.old_media_id and e.scope_id=m.scope_id;
do $$
begin
  if exists(select 1 from silver.archive_media_exif where media_id is not null and media_uid is null) then
    raise exception 'Archive EXIF media reference cannot be converted';
  end if;
end
$$;
alter table silver.archive_media_exif drop column media_id;
create index archive_media_exif_media_uid_idx on silver.archive_media_exif(media_uid);

alter table silver.lo3rwang_galaxy_media add constraint lo3rwang_galaxy_media_uid_format check(uid ~ '^[A-Z0-9]{8}$');
alter table silver.lrunes_galaxy_media add constraint lrunes_galaxy_media_uid_format check(uid ~ '^[A-Z0-9]{8}$');

alter table silver.lo3rwang_galaxy_media drop constraint lo3rwang_galaxy_media_pkey;
alter table silver.lo3rwang_galaxy_media add constraint lo3rwang_galaxy_media_pkey primary key(uid);
alter table silver.lo3rwang_galaxy_media drop constraint lo3rwang_galaxy_media_uid_key;
alter table silver.lrunes_galaxy_media drop constraint lrunes_galaxy_media_pkey;
alter table silver.lrunes_galaxy_media add constraint lrunes_galaxy_media_pkey primary key(uid);
alter table silver.lrunes_galaxy_media drop constraint lrunes_galaxy_media_uid_key;

alter table silver.lo3rwang_galaxy_media drop column media_id;
alter table silver.lrunes_galaxy_media drop column media_id;

-- Existing scope authorization and EXIF privacy semantics remain unchanged.
create or replace function silver.save_archive_media_exif(p_scope_id text,p_rows jsonb)
returns integer
language plpgsql security definer set search_path=''
as $$
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
    v_id := nullif(upper(btrim(v_row->>'media_uid')),'');
    if v_id is not null and v_id !~ '^[A-Z0-9]{8}$' then
      raise exception 'Invalid EXIF media UID';
    end if;
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
$$;
revoke all on function silver.save_archive_media_exif(text,jsonb) from public;
grant execute on function silver.save_archive_media_exif(text,jsonb) to authenticated;
