-- Shadow keys precede the relational cutover; no existing media references are rewritten here.
create schema if not exists loc_cleanup_archive;
create or replace function silver.generate_galaxy_media_uid8()
returns varchar(8)
language sql volatile set search_path = ''
as $$
  select string_agg(substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
     (get_byte(bytes, i) % 36)+1, 1), '' order by i)::varchar(8)
  from (select decode(replace(pg_catalog.gen_random_uuid()::text, '-', ''), 'hex') as bytes) source
  cross join pg_catalog.generate_series(0,7) as i
$$;
revoke all on function silver.generate_galaxy_media_uid8() from public;
grant execute on function silver.generate_galaxy_media_uid8() to authenticated, service_role;
alter table silver.lo3rwang_galaxy_media add column uid varchar(8);
alter table silver.lrunes_galaxy_media add column uid varchar(8);
update silver.lo3rwang_galaxy_media set uid=silver.generate_galaxy_media_uid8();
update silver.lrunes_galaxy_media set uid=silver.generate_galaxy_media_uid8();
alter table silver.lo3rwang_galaxy_media alter column uid set default silver.generate_galaxy_media_uid8();
alter table silver.lrunes_galaxy_media alter column uid set default silver.generate_galaxy_media_uid8();
alter table silver.lo3rwang_galaxy_media alter column uid set not null;
alter table silver.lrunes_galaxy_media alter column uid set not null;
alter table silver.lo3rwang_galaxy_media add constraint lo3rwang_galaxy_media_uid_key unique(uid);
alter table silver.lrunes_galaxy_media add constraint lrunes_galaxy_media_uid_key unique(uid);
create table loc_cleanup_archive.galaxy_media_uid_map_20261028(
 scope_id text not null,
 old_media_id uuid not null,
 uid varchar(8) not null,
 primary key(scope_id,old_media_id),
 unique(scope_id,uid)
);
insert into loc_cleanup_archive.galaxy_media_uid_map_20261028(scope_id,old_media_id,uid)
select 'lo3rwang',media_id,uid from silver.lo3rwang_galaxy_media
union all
select 'lrunes',media_id,uid from silver.lrunes_galaxy_media;
