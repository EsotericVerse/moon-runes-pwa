-- FAQ list fields are native PostgreSQL arrays, not JSON documents.
-- The deployed columns were verified to contain only JSON string arrays.
drop view api.faq_current;
create function silver.jsonb_text_array(p_value jsonb) returns text[]
language sql immutable strict
as 'select coalesce(array_agg(value), array[]::text[]) from jsonb_array_elements_text(p_value) as v(value)';
alter table silver.faq_entries
  alter column aliases drop default,
  alter column aliases type text[] using silver.jsonb_text_array(aliases),
  alter column aliases set default array[]::text[],
  alter column keywords drop default,
  alter column keywords type text[] using silver.jsonb_text_array(keywords),
  alter column keywords set default array[]::text[],
  alter column related_ids drop default,
  alter column related_ids type text[] using silver.jsonb_text_array(related_ids),
  alter column related_ids set default array[]::text[],
  alter column source_refs drop default,
  alter column source_refs type text[] using silver.jsonb_text_array(source_refs),
  alter column source_refs set default array[]::text[];
alter table silver.faq_rag_chunks
  alter column aliases drop default,
  alter column aliases type text[] using silver.jsonb_text_array(aliases),
  alter column aliases set default array[]::text[],
  alter column keywords drop default,
  alter column keywords type text[] using silver.jsonb_text_array(keywords),
  alter column keywords set default array[]::text[],
  alter column related_ids drop default,
  alter column related_ids type text[] using silver.jsonb_text_array(related_ids),
  alter column related_ids set default array[]::text[],
  alter column source_refs drop default,
  alter column source_refs type text[] using silver.jsonb_text_array(source_refs),
  alter column source_refs set default array[]::text[];
drop function silver.jsonb_text_array(jsonb);
create view api.faq_current as
select f.faq_id,f.category,f.intent,f.question,f.aliases,f.answer,f.keywords,
       f.related_ids,f.source_refs,f.canon_version,f.status,r.chunk_id,
       r.retrieval_text,f.updated_at
from silver.faq_entries f
left join silver.faq_rag_chunks r on r.parent_faq_id=f.faq_id;
grant select on api.faq_current to anonymous, authenticated;
