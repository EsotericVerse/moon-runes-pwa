-- Once six-field readers/writers and new Scope provisioning are installed,
-- the original numbered catalogs have no consumers. Do not CASCADE drops.
DROP TABLE IF EXISTS silver.lo3rwang_keywords_legacy;
DROP TABLE IF EXISTS silver.lrunes_keywords_legacy;
DROP FUNCTION IF EXISTS silver.new_keyword_class_uid();
DROP TABLE IF EXISTS silver.keyword_classes;
NOTIFY pgrst,'reload schema';
