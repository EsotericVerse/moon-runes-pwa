-- Remove the obsolete rune-literature statistics projection.
-- The 559 rune_literature rows contain precomputed match/configuration arrays;
-- the 5 rune_song rows duplicate song metadata. Canonical Galaxy and Suno rows remain.
BEGIN;

DO $$
DECLARE
  literature_rows integer;
  rune_song_rows integer;
  derived_relation_rows integer;
BEGIN
  SELECT count(*) INTO literature_rows
  FROM silver.lrunes_literature
  WHERE content_type = 'rune_literature';

  SELECT count(*) INTO rune_song_rows
  FROM silver.lrunes_literature
  WHERE content_type = 'rune_song';

  SELECT count(*) INTO derived_relation_rows
  FROM silver.content_relations
  WHERE (from_kind = 'lrunes_rune' AND relation_type = 'chapter_rune')
     OR (from_kind = 'rune_song' AND relation_type = 'links_to_song');

  IF literature_rows <> 559 OR rune_song_rows <> 5 OR derived_relation_rows <> 564 THEN
    RAISE EXCEPTION 'Unexpected obsolete rune projection counts: literature %, songs %, relations %',
      literature_rows, rune_song_rows, derived_relation_rows;
  END IF;
END $$;

DROP VIEW IF EXISTS api.loc_literature;

DELETE FROM silver.content_relations
WHERE (from_kind = 'lrunes_rune' AND relation_type = 'chapter_rune')
   OR (from_kind = 'rune_song' AND relation_type = 'links_to_song');

DROP TABLE silver.lrunes_literature;

COMMIT;
