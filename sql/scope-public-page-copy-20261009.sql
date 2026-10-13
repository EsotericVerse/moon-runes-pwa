-- Page copy is public, while silver.manage administrator rows remain private.
CREATE OR REPLACE FUNCTION silver.read_scope_page_copy(p_scope_id text)
RETURNS TABLE("Title_TW" text, "Desc_TW" text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $body$
 SELECT nullif(btrim(m."Title_TW"),''), nullif(btrim(m."Desc_TW"),'')
 FROM silver.manage m JOIN silver.scope_registry r
 ON r.scope_id=m.id AND r.active AND r.scope_kind='scope'
 WHERE m.id=lower(btrim(p_scope_id))
 AND lower(btrim(p_scope_id)) ~ '^[a-z][a-z0-9]{0,14}$'
 ORDER BY m.email LIMIT 1;
$body$;
REVOKE ALL ON FUNCTION silver.read_scope_page_copy(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION silver.read_scope_page_copy(text) TO anon, authenticated;
