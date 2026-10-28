-- Canonical relationship: galaxy.media_link -> galaxy_media.uid.
do $$
declare v_def text;
  v_old text := 'execute format(''alter table silver.%I add constraint %I foreign key (galaxy_link) references silver.%I(uid)'',v_media_name,v_scope||''_galaxy_media_galaxy_link_fk'',v_galaxy_name);';
begin
  select pg_get_functiondef(p.oid) into v_def from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='api' and p.proname='provision_scope';
  if v_def is null or position(v_old in v_def)=0 then
    raise exception 'api.provision_scope reverse media constraint definition changed';
  end if;
  execute replace(v_def,v_old,'');
end $$;
with extra as (
  select m.galaxy_link,array_agg(m.uid order by m.uid)::varchar[] as ids
  from silver.lo3rwang_galaxy_media m join silver.lo3rwang_galaxy g on g.uid=m.galaxy_link
  where not (m.uid=any(coalesce(g.media_link,array[]::varchar[])))
  group by m.galaxy_link
)
update silver.lo3rwang_galaxy g set media_link=coalesce(g.media_link,array[]::varchar[])||extra.ids
from extra where g.uid=extra.galaxy_link;
with extra as (
  select m.galaxy_link,array_agg(m.uid order by m.uid)::varchar[] as ids
  from silver.lrunes_galaxy_media m join silver.lrunes_galaxy g on g.uid=m.galaxy_link
  where not (m.uid=any(coalesce(g.media_link,array[]::varchar[])))
  group by m.galaxy_link
)
update silver.lrunes_galaxy g set media_link=coalesce(g.media_link,array[]::varchar[])||extra.ids
from extra where g.uid=extra.galaxy_link;
do $$
begin
 if exists(select 1 from silver.lo3rwang_galaxy_media m
    where m.galaxy_link is not null and not exists(
      select 1 from silver.lo3rwang_galaxy g where g.uid=m.galaxy_link and m.uid=any(g.media_link)))
 or exists(select 1 from silver.lrunes_galaxy_media m
    where m.galaxy_link is not null and not exists(
      select 1 from silver.lrunes_galaxy g where g.uid=m.galaxy_link and m.uid=any(g.media_link)))
 then raise exception 'Unmigrated media links'; end if;
end $$;
alter table silver.lo3rwang_galaxy_media drop column galaxy_link;
alter table silver.lrunes_galaxy_media drop column galaxy_link;
