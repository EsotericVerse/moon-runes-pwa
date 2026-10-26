-- Search autocomplete is text-only. Spatial candidates belong to Galaxy.place_id / Trace.
-- Apply only after the derived tables' old place rows are removed.
alter table silver.loc_search_terms
  drop constraint if exists loc_search_terms_term_kind_check;
alter table silver.loc_search_terms
  add constraint loc_search_terms_term_kind_check
  check (term_kind in ('title','keyword','hashtag','source','media'));

alter table silver.lo3rwang_search_terms
  drop constraint if exists lo3rwang_search_terms_term_kind_check;
alter table silver.lo3rwang_search_terms
  add constraint lo3rwang_search_terms_term_kind_check
  check (term_kind in ('title','keyword','hashtag','source','media'));

alter table silver.lrunes_search_terms
  drop constraint if exists lrunes_search_terms_term_kind_check;
alter table silver.lrunes_search_terms
  add constraint lrunes_search_terms_term_kind_check
  check (term_kind in ('title','keyword','hashtag','source','media'));
