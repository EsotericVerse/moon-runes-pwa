-- Base62 is case-sensitive. Shared lookup exposes only the selected shared Class;
-- an authenticated owner is authorized through the active provider's database claims.
CREATE OR REPLACE FUNCTION silver.read_keyword_class_by_uid(p_scope_id text, p_class_uid text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
 v_scope text := lower(btrim(coalesce(p_scope_id,'')));
 v_uid text := coalesce(p_class_uid,'');
 v_config regclass;
 v_keywords regclass;
 v_shared boolean := false;
 v_items jsonb;
BEGIN
 IF v_scope !~ '^[a-z][a-z0-9]{0,14}$' OR v_uid !~ '^[0-9A-Za-z]{4}$' THEN RETURN NULL; END IF;
 IF NOT EXISTS(SELECT 1 FROM silver.keyword_classes WHERE scope_id=v_scope AND class_uid=v_uid) THEN RETURN NULL; END IF;
 IF NOT EXISTS(SELECT 1 FROM silver.manage WHERE id=v_scope AND manage_role='scope') THEN RETURN NULL; END IF;
 v_config:=to_regclass(format('silver.%I',v_scope));
 v_keywords:=to_regclass(format('silver.%I_keywords',v_scope));
 IF v_config IS NULL OR v_keywords IS NULL THEN RETURN NULL; END IF;
 IF NOT silver.can_manage_scope(v_scope) THEN
   EXECUTE format('SELECT coalesce(keyword_class_share_enabled,false) AND current_keyword_class_uid=$1 FROM %s WHERE id=$2',v_config)
     INTO v_shared USING v_uid,v_scope;
   IF v_shared IS DISTINCT FROM TRUE THEN RETURN NULL; END IF;
 END IF;
 EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(k) ORDER BY k.order_no,k.keyword_id),''[]''::jsonb) FROM %s k WHERE k.class_uid=$1',v_keywords)
   INTO v_items USING v_uid;
 RETURN coalesce(v_items,'[]'::jsonb);
END
$function$;
REVOKE ALL ON FUNCTION silver.read_keyword_class_by_uid(text,text) FROM PUBLIC;
DO $grant$
BEGIN
  IF EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='anon') THEN
    GRANT EXECUTE ON FUNCTION silver.read_keyword_class_by_uid(text,text) TO anon;
  END IF;
  IF EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='anonymous') THEN
    GRANT EXECUTE ON FUNCTION silver.read_keyword_class_by_uid(text,text) TO anonymous;
  END IF;
  IF EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='authenticated') THEN
    GRANT EXECUTE ON FUNCTION silver.read_keyword_class_by_uid(text,text) TO authenticated;
  END IF;
END $grant$;
