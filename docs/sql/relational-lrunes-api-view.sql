-- Keep the public rune API view scalar-only; the underlying canonical JSON
-- column is handled by the relational rune-data migration.
drop view api.lrunes_runes;
create view api.lrunes_runes as
select rune_number, rune_name, group_name, english_name, updated_at
from silver.lrunes_runes;
grant select on api.lrunes_runes to anonymous, authenticated;
