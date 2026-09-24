-- Normalize canonical rune fields into typed columns. Keyword mapping is
-- centralized in silver.lrunes_style as requested.
BEGIN;
CREATE TABLE silver.lrunes_style (
  rune_number integer PRIMARY KEY REFERENCES silver.lrunes_runes(rune_number) ON DELETE CASCADE,
  group_name text,
  positive_keywords text,
  negative_keywords text
);
ALTER TABLE silver.lrunes_runes
  ADD COLUMN personality_archetype text,
  ADD COLUMN card_attribute text,
  ADD COLUMN totem text,
  ADD COLUMN moon_phase text,
  ADD COLUMN positive_meaning text,
  ADD COLUMN reverse_meaning text,
  ADD COLUMN half_positive_meaning text,
  ADD COLUMN half_reverse_meaning text,
  ADD COLUMN rune_description text,
  ADD COLUMN character_action text,
  ADD COLUMN extra_notes text,
  ADD COLUMN extra_rules text;
INSERT INTO silver.lrunes_style(rune_number,group_name,positive_keywords,negative_keywords)
SELECT rune_number,group_name,canonical_payload->>'正向關鍵詞',canonical_payload->>'反向關鍵詞'
FROM silver.lrunes_runes;
UPDATE silver.lrunes_runes SET
  personality_archetype=canonical_payload->>'人格原型',
  card_attribute=canonical_payload->>'卡片屬性',
  totem=canonical_payload->>'圖騰',
  moon_phase=canonical_payload->>'月相',
  positive_meaning=canonical_payload->>'正向表示',
  reverse_meaning=canonical_payload->>'逆向表示',
  half_positive_meaning=canonical_payload->>'半正向表示',
  half_reverse_meaning=canonical_payload->>'半逆向表示',
  rune_description=canonical_payload->>'符文說明',
  character_action=canonical_payload->>'角色行動',
  extra_notes=canonical_payload->>'額外留意',
  extra_rules=canonical_payload->>'額外規則';
ALTER TABLE silver.lrunes_runes DROP COLUMN canonical_payload;
GRANT SELECT ON silver.lrunes_style TO anonymous,authenticated;
COMMIT;
