-- D lane: scope-isolated, read-only, precomputed FlexSearch candidate terms.
-- Search history remains in loc_search_keywords and is never used here.
-- No ISR, no cache, no trigger on Galaxy writes, and no cross-Scope union.
create table if not exists silver.loc_search_terms (
  term text primary key,
  document_count integer not null default 0 check (document_count >= 0),
  term_kind text not null default 'title'
    check (term_kind in ('title','place','keyword','hashtag','source','media')),
  refreshed_at timestamptz not null default now(),
  constraint loc_search_term_length check (char_length(term) between 1 and 96)
);
alter table silver.loc_search_terms enable row level security;
revoke all on silver.loc_search_terms from public, anon, authenticated;
grant select on silver.loc_search_terms to anon, authenticated;
drop policy if exists search_terms_public_read on silver.loc_search_terms;
create policy search_terms_public_read on silver.loc_search_terms
  for select to anon, authenticated using (true);

create table if not exists silver.lo3rwang_search_terms (
  term text primary key,
  document_count integer not null default 0 check (document_count >= 0),
  term_kind text not null default 'title'
    check (term_kind in ('title','place','keyword','hashtag','source','media')),
  refreshed_at timestamptz not null default now(),
  constraint lo3rwang_search_term_length check (char_length(term) between 1 and 96)
);
alter table silver.lo3rwang_search_terms enable row level security;
revoke all on silver.lo3rwang_search_terms from public, anon, authenticated;
grant select on silver.lo3rwang_search_terms to anon, authenticated;
drop policy if exists search_terms_public_read on silver.lo3rwang_search_terms;
create policy search_terms_public_read on silver.lo3rwang_search_terms
  for select to anon, authenticated using (true);

create table if not exists silver.lrunes_search_terms (
  term text primary key,
  document_count integer not null default 0 check (document_count >= 0),
  term_kind text not null default 'title'
    check (term_kind in ('title','place','keyword','hashtag','source','media')),
  refreshed_at timestamptz not null default now(),
  constraint lrunes_search_term_length check (char_length(term) between 1 and 96)
);
alter table silver.lrunes_search_terms enable row level security;
revoke all on silver.lrunes_search_terms from public, anon, authenticated;
grant select on silver.lrunes_search_terms to anon, authenticated;
drop policy if exists search_terms_public_read on silver.lrunes_search_terms;
create policy search_terms_public_read on silver.lrunes_search_terms
  for select to anon, authenticated using (true);
