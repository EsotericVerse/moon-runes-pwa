-- Manual/administrative rebuild ONLY. Run in an authorized maintenance window.
-- The published site never runs these writes, and no ISR/cache/cron is involved.
-- Each statement reads exactly one Scope and writes only that Scope's derived table.
begin;
delete from silver.lo3rwang_search_terms;
-- Only this Scope's publicly searchable Galaxy data and published keyword class.
with raw as (
select btrim(source_place) term,count(*)::integer n,'place'::text kind,60 priority
from silver.lo3rwang_galaxy where searchable is true and nullif(btrim(source_place),'') is not null
group by btrim(source_place)
union all
select btrim(title) term,count(*)::integer n,'title'::text kind,30 priority
from silver.lo3rwang_galaxy where searchable is true and char_length(btrim(title)) between 3 and 64
and title !~* '(更新了|分享了|透過.{0,60}發表|新增了|發表了動態|說.{0,24}讚|^全曲|https?://)'
group by btrim(title)
union all
select btrim(m[1]) term,count(*)::integer n,'hashtag'::text kind,70 priority
from silver.lo3rwang_galaxy g cross join lateral regexp_matches(coalesce(g.content,''),'[#＃]([[:alnum:]_]{2,40})','g') m
where g.searchable is true group by btrim(m[1])
union all
select btrim(source_name) term,count(*)::integer n,'source'::text kind,10 priority
from silver.lo3rwang_galaxy where searchable is true and nullif(btrim(source_name),'') is not null
group by btrim(source_name)
union all
select btrim(x.word) term,1::integer n,'keyword'::text kind,90 priority
from silver.lo3rwang_keywords k cross join lateral jsonb_array_elements_text(k.keywords) x(word)
where exists(select 1 from silver.lo3rwang cfg where cfg.keyword_class_share_enabled is true and cfg.current_keyword_class_id=k.class_id)
),
filtered as (
  select term,n,kind,priority from raw
  where char_length(term) between 2 and 96
    and term ~ '[[:alpha:]]'
    and term !~* '^https?://' and term !~ '^[0-9]+$'
),
ranked as (
  select (array_agg(term order by priority desc,n desc))[1] term,
         sum(n)::integer document_count,
         (array_agg(kind order by priority desc,n desc))[1] term_kind,
         max(priority) priority
  from filtered group by lower(term)
),
chosen as (
  select * from ranked
  order by priority desc,document_count desc,term
  limit 2048
)
insert into silver.lo3rwang_search_terms(term,document_count,term_kind,refreshed_at)
select term,document_count,term_kind,now() from chosen
on conflict(term) do update
  set document_count=excluded.document_count,
      term_kind=excluded.term_kind,
      refreshed_at=excluded.refreshed_at;
delete from silver.lrunes_search_terms;
-- Only this Scope's publicly searchable Galaxy data and published keyword class.
with raw as (
select btrim(source_place) term,count(*)::integer n,'place'::text kind,60 priority
from silver.lrunes_galaxy where searchable is true and nullif(btrim(source_place),'') is not null
group by btrim(source_place)
union all
select btrim(title) term,count(*)::integer n,'title'::text kind,30 priority
from silver.lrunes_galaxy where searchable is true and char_length(btrim(title)) between 3 and 64
and title !~* '(更新了|分享了|透過.{0,60}發表|新增了|發表了動態|說.{0,24}讚|^全曲|https?://)'
group by btrim(title)
union all
select btrim(m[1]) term,count(*)::integer n,'hashtag'::text kind,70 priority
from silver.lrunes_galaxy g cross join lateral regexp_matches(coalesce(g.content,''),'[#＃]([[:alnum:]_]{2,40})','g') m
where g.searchable is true group by btrim(m[1])
union all
select btrim(source_name) term,count(*)::integer n,'source'::text kind,10 priority
from silver.lrunes_galaxy where searchable is true and nullif(btrim(source_name),'') is not null
group by btrim(source_name)
),
filtered as (
  select term,n,kind,priority from raw
  where char_length(term) between 2 and 96
    and term ~ '[[:alpha:]]'
    and term !~* '^https?://' and term !~ '^[0-9]+$'
),
ranked as (
  select (array_agg(term order by priority desc,n desc))[1] term,
         sum(n)::integer document_count,
         (array_agg(kind order by priority desc,n desc))[1] term_kind,
         max(priority) priority
  from filtered group by lower(term)
),
chosen as (
  select * from ranked
  order by priority desc,document_count desc,term
  limit 2048
)
insert into silver.lrunes_search_terms(term,document_count,term_kind,refreshed_at)
select term,document_count,term_kind,now() from chosen
on conflict(term) do update
  set document_count=excluded.document_count,
      term_kind=excluded.term_kind,
      refreshed_at=excluded.refreshed_at;
delete from silver.loc_search_terms;
insert into silver.loc_search_terms(term,document_count,term_kind,refreshed_at)
select distinct btrim(word),0,'keyword',now()
from silver.loc l
cross join lateral unnest(
  coalesce(l.txt_class,array[]::text[]) ||
  coalesce(l.search_aliases,array[]::text[]) ||
  array[coalesce(l.display_name,'LOC')]
) word
where length(btrim(word)) between 2 and 96 and btrim(word)<>''
on conflict(term) do update set refreshed_at=now();
commit;
