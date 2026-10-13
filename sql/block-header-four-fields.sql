-- Non-destructive, repeatable extension for LOC, LunaRunes, and Author page blocks.
-- Never rerun the destructive 2026-10 seed to provision headings.
-- Each block has exactly one English eyebrow, title, rich subtitle and rich body.
-- Child JSON entities with a nonblank title are nested cards; an empty title
-- denotes a title-free bubble. Do NOT introduce a kind/type selector or column.
begin;
alter table silver.loc_blocks
  add column if not exists block_eyebrow text not null default '',
  add column if not exists block_subtitle text not null default '';
alter table silver.lo3rwang_blocks
  add column if not exists block_eyebrow text not null default '',
  add column if not exists block_subtitle text not null default '';
alter table silver.lrunes_blocks
  add column if not exists block_eyebrow text not null default '',
  add column if not exists block_subtitle text not null default '';
commit;
-- Backfill legacy authored subtitles only with a separately inspected,
-- content-preserving SQL update. Existing block_text and block_entity are never
-- deleted or rewritten by this migration.
