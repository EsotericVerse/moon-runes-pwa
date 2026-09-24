-- Normalize the 12 legacy author context entries and preserve each list item
-- with its category and original order.
alter table silver.lo3rwang_context_entries
  add column source_id text,
  add column entry_name text;
update silver.lo3rwang_context_entries
set source_id=payload->>'id',
    entry_name=payload->>'name';
create table silver.lo3rwang_context_entry_items (
  context_key text not null references silver.lo3rwang_context_entries(context_key) on delete cascade,
  item_type text not null check (item_type in ('alias','outline','related','era')),
  item_order integer not null check (item_order > 0),
  item_value text not null,
  primary key (context_key,item_type,item_order)
);
insert into silver.lo3rwang_context_entry_items(context_key,item_type,item_order,item_value)
select c.context_key,v.item_type,e.ordinality::integer,e.item_value
from silver.lo3rwang_context_entries c
cross join lateral (values
  ('alias',c.payload->'aliases'),
  ('outline',c.payload->'outline'),
  ('related',c.payload->'related'),
  ('era',c.payload->'eras')
) v(item_type,items)
cross join lateral jsonb_array_elements_text(v.items) with ordinality e(item_value,ordinality);
alter table silver.lo3rwang_context_entries drop column payload;
