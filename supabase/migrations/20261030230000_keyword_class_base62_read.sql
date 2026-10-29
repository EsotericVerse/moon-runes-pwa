-- After the six-column Keyword tree cutover, the old Item-numbered
-- Class reader must not be recreated by the October 30 compatibility patch.
-- Case-sensitive Base62 lookup is already provided by:
--   silver.read_keyword_tree_catalog(scope_id, class_uid)
-- It accepts any authorized four-character Class UID and reveals no Item rules.
DO $check$
BEGIN
  IF to_regprocedure('silver.read_keyword_tree_catalog(text,text)') IS NULL THEN
    RAISE EXCEPTION 'The Keywords Class-aware UID tree catalog must be installed first';
  END IF;
END
$check$;
DROP FUNCTION IF EXISTS silver.read_keyword_class_by_uid(text,text);
NOTIFY pgrst,'reload schema';
