-- Normalize context graph and ranking entries. The extra rune object in each
-- matching context row exactly duplicates silver.lrunes_runes.canonical_payload
-- and is reached through rune_number.
drop view api.loc_context_entries;
drop view api.runes_context_entries;
drop view api.lo3rwang_context_entries;
drop view api.loc_rankings;
drop view api.runes_rankings;
drop view api.lo3rwang_rankings;
alter table silver.runes_context_entries
  add column source_id text,
  add column source text,
  add column note text;
update silver.runes_context_entries
set source_id=payload->>'id',
    source=payload->>'source',
    note=payload->>'note';
alter table silver.runes_context_entries drop column payload;
alter table silver.lo3rwang_period_context_entries drop column payload;
alter table silver.runes_rankings drop column payload;
alter table silver.lo3rwang_rankings drop column payload;
create view api.runes_context_entries as
select context_key,context_type,title,summary,updated_at,kind,node_type,
       entry_scope,description,context_date,date_status,anchor_id,before_id,
       after_id,order_no,rune_count,rune_number,literature_id,work_id,status,
       milestone,style_prompt,ranking_types,source_id,source,note
from silver.runes_context_entries;
create view api.lo3rwang_context_entries as
select context_key,context_type,title,summary,updated_at,era_id,period,entry_name,
       start_date,end_date,order_no,status,anchor_id,start_anchor_id,end_anchor_id,
       date_value,date_status,entry_scope,visibility,event_id,year_value
from silver.lo3rwang_period_context_entries;
create view api.loc_context_entries as
select 'runes'::text scope_id,context_key,context_type,title,summary,updated_at,
       kind,node_type,entry_scope,description,context_date,date_status,anchor_id,
       before_id,after_id,order_no,rune_count,rune_number,literature_id,work_id,
       status,milestone,style_prompt,ranking_types,source_id,source,note,
       null::text era_id,null::text period,null::text entry_name,
       null::text start_date,null::text end_date,null::text start_anchor_id,
       null::text end_anchor_id,null::text date_value,null::text visibility,
       null::text event_id,null::integer year_value
from silver.runes_context_entries
union all
select 'lo3rwang'::text scope_id,context_key,context_type,title,summary,updated_at,
       null::text kind,null::text node_type,entry_scope,null::text description,
       null::text context_date,date_status,anchor_id,null::text before_id,
       null::text after_id,order_no,null::integer rune_count,null::integer rune_number,
       null::text literature_id,null::text work_id,status,null::text milestone,
       null::text style_prompt,null::text[] ranking_types,null::text source_id,
       null::text source,null::text note,era_id,period,entry_name,start_date,end_date,
       start_anchor_id,end_anchor_id,date_value,visibility,event_id,year_value
from silver.lo3rwang_period_context_entries;
create view api.runes_rankings as
select ranking_key,ranking_type,term,rank_value,item_count,updated_at,source
from silver.runes_rankings;
create view api.lo3rwang_rankings as
select ranking_key,ranking_type,term,rank_value,item_count,updated_at,period,hit_count,percent
from silver.lo3rwang_rankings;
create view api.loc_rankings as
select 'runes'::text scope_id,ranking_key,ranking_type,term,rank_value,item_count,
       updated_at,null::text period,null::bigint hit_count,null::numeric percent,source
from silver.runes_rankings
union all
select 'lo3rwang'::text scope_id,ranking_key,ranking_type,term,rank_value,item_count,
       updated_at,period,hit_count,percent,null::text source
from silver.lo3rwang_rankings;
grant select on api.runes_context_entries,api.lo3rwang_context_entries,
  api.loc_context_entries,api.runes_rankings,api.lo3rwang_rankings,api.loc_rankings
to anonymous,authenticated;
