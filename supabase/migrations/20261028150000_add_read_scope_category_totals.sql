-- Cheap totals-only companion to silver.read_scope_statistics: counts per
-- source/media category for a Scope and date window, WITHOUT grouping by
-- day. Culture's collapsed (unexpanded) river lanes only need one number
-- per source to size a flat water-level bar -- they do not need the full
-- per-day breakdown, which is what made silver.read_scope_statistics slow
-- for wide date windows (it has to group by day AND category). Per-day
-- density is still fetched from silver.read_scope_statistics, but only
-- once a lane is actually expanded.
create or replace function silver.read_scope_category_totals(p_scope_id text, p_start date, p_end date)
returns table(kind text, category text, item_count integer)
language plpgsql
stable
set search_path to ''
as $function$
declare
  v_id     text := lower(btrim(coalesce(p_scope_id, '')));
  v_galaxy regclass;
  v_media  regclass;
  v_from   timestamptz;
  v_to     timestamptz;
begin
  if v_id !~ '^[a-z][a-z0-9]{0,14}$' then
    raise exception 'Invalid scope id' using errcode = '22023';
  end if;

  v_galaxy := to_regclass(format('silver.%I', v_id || '_galaxy'));
  v_media  := to_regclass(format('silver.%I', v_id || '_galaxy_media'));
  if v_galaxy is null or v_media is null then
    raise exception 'Unknown scope' using errcode = '22023';
  end if;

  v_from := case when p_start is null then null
                 else p_start::timestamp at time zone 'Asia/Taipei' end;
  v_to   := case when p_end is null then null
                 else (p_end::timestamp + time '23:59:59.999') at time zone 'Asia/Taipei' end;

  return query execute format($sql$
    select 'source'::text, btrim(coalesce(source_name, ''), E' \t\n\r\f\v 　﻿'), count(*)::integer
    from %1$s
    where statistics_able and content <> ''
      and ($1 is null or createtime >= $1) and ($2 is null or createtime <= $2)
    group by 1, 2
    union all
    select 'media'::text, btrim(coalesce(media_type, ''), E' \t\n\r\f\v 　﻿'), count(*)::integer
    from %2$s
    where ($1 is null or createtime >= $1) and ($2 is null or createtime <= $2)
    group by 1, 2
  $sql$, v_galaxy, v_media)
  using v_from, v_to;
end;
$function$;

grant execute on function silver.read_scope_category_totals(text, date, date) to anon, authenticated;
