create table silver.loc_timeline_entries (
  scope_id text not null,
  entry_key text not null,
  entry_type text not null,
  title text not null,
  summary text,
  start_date date,
  end_date date,
  era_id text,
  period text,
  entry_name text,
  order_no numeric,
  status text,
  anchor_id text,
  start_anchor_id text,
  end_anchor_id text,
  before_id text,
  after_id text,
  date_status text,
  entry_scope text,
  visibility text,
  event_id text,
  year_value integer,
  rune_count integer,
  source_id text,
  source text,
  note text,
  primary key (scope_id,entry_key)
);

insert into silver.loc_timeline_entries (
  scope_id,entry_key,entry_type,title,summary,start_date,end_date,order_no,
  status,anchor_id,before_id,after_id,date_status,entry_scope,rune_count,
  source_id,source,note
)
select
  'runes',context_key,context_type,coalesce(nullif(title,''),context_key),
  coalesce(summary,description),nullif(context_date,'')::date,null,
  order_no,status,anchor_id,before_id,after_id,date_status,entry_scope,
  rune_count,source_id,source,note
from silver.runes_context_entries
where context_type='anchor';

insert into silver.loc_timeline_entries (
  scope_id,entry_key,entry_type,title,summary,start_date,end_date,era_id,
  period,entry_name,order_no,status,anchor_id,start_anchor_id,end_anchor_id,
  date_status,entry_scope,visibility,event_id,year_value
)
select
  'lo3rwang',context_key,context_type,coalesce(nullif(title,''),context_key),
  summary,coalesce(nullif(start_date,''),nullif(date_value,''))::date,
  nullif(end_date,'')::date,era_id,period,entry_name,order_no,status,anchor_id,
  start_anchor_id,end_anchor_id,date_status,entry_scope,visibility,event_id,
  year_value
from silver.lo3rwang_period_context_entries
where context_type in ('period','period_legacy','event','anchor');

create index loc_timeline_entries_scope_type_date_idx
  on silver.loc_timeline_entries (scope_id,entry_type,start_date);

create view api.loc_timeline_entries as
select scope_id,entry_key,entry_type,title,summary,start_date,end_date,era_id,
       period,entry_name,order_no,status,anchor_id,start_anchor_id,end_anchor_id,
       before_id,after_id,date_status,entry_scope,visibility,event_id,year_value,
       rune_count,source_id,source,note
from silver.loc_timeline_entries;

grant select on api.loc_timeline_entries to anonymous,authenticated;
