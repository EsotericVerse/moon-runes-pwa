create table silver.content_aliases (
  scope_id text not null,
  entity_type text not null,
  entity_id text not null,
  alias_order integer not null check (alias_order > 0),
  alias_text text not null,
  primary key (scope_id,entity_type,entity_id,alias_order)
);
create index content_aliases_lookup_idx on silver.content_aliases(scope_id,alias_text);
insert into silver.content_aliases(scope_id,entity_type,entity_id,alias_order,alias_text)
select 'lo3rwang','context_entry',context_key,item_order,item_value
from silver.lo3rwang_context_entry_items
where item_type='alias';
delete from silver.lo3rwang_context_entry_items where item_type='alias';
