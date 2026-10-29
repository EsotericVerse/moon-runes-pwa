-- All public keyword consumers now read the six-field UID tree.
-- Disable old writer RPCs before the cutover can affect Galaxy contents.
REVOKE ALL ON FUNCTION api.apply_keyword_classification(text,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION silver.apply_keyword_classification(text,jsonb) FROM PUBLIC,anon,authenticated;
DROP FUNCTION IF EXISTS api.apply_keyword_classification(jsonb);
DROP FUNCTION IF EXISTS api.apply_keyword_classification(text,jsonb);
DROP FUNCTION IF EXISTS silver.apply_keyword_classification(text,jsonb);
DROP FUNCTION IF EXISTS api.read_keyword_class(text,uuid);
DROP FUNCTION IF EXISTS silver.read_keyword_class(text,uuid);
DROP FUNCTION IF EXISTS api.copy_rune66_keyword_class(text);
DROP FUNCTION IF EXISTS silver.copy_rune66_keyword_class(text);
DROP FUNCTION IF EXISTS silver.read_keyword_class_by_uid(text,text);
DROP FUNCTION IF EXISTS silver.read_rune66_summary(text,date,date);
DROP FUNCTION IF EXISTS silver.read_keyword_uidlist_summary(text,date,date,text);
DROP FUNCTION IF EXISTS silver.read_keyword_item_catalog(text);
-- The previous trigger belongs to the now read-only *_keywords_legacy tables.
DROP TRIGGER IF EXISTS lo3rwang_keywords_class_uid_sync ON silver.lo3rwang_keywords_legacy;
DROP TRIGGER IF EXISTS lrunes_keywords_class_uid_sync ON silver.lrunes_keywords_legacy;
DROP FUNCTION IF EXISTS silver.sync_keyword_class_uid();
NOTIFY pgrst,'reload schema';
