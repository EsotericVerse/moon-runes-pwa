-- Keywords Group count belongs to each Class, not to the Rune66 layout.
-- Legacy Galaxy columns remain readable until the planned uidlist cutover.
-- These constraints cap generic classification groups at 9 (or 8), even though
-- the current Pop catalog already defines 16 groups.
ALTER TABLE silver.lo3rwang_galaxy DROP CONSTRAINT IF EXISTS lo3rwang_galaxy_class_id_check;
ALTER TABLE silver.lrunes_galaxy DROP CONSTRAINT IF EXISTS lrunes_galaxy_class_id_check;
