-- Public aggregate statistics may show Item labels and Group membership,
-- but must never expose keyword rules or the underlying article UID lists.
CREATE OR REPLACE FUNCTION silver.read_keyword_item_catalog(p_scope_id text)
RETURNS TABLE(keyword_id bigint,class_group text,item_name text,order_no integer,class_enable boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $fn$
DECLARE
  v_scope text:=lower(btrim(coalesce(p_scope_id,'')));
  v_config regclass;
  v_keywords regclass;
  v_class_uid text;
  v_public boolean:=false;
BEGIN
  IF v_scope !~ '^[a-z][a-z0-9]{0,14}$' THEN RETURN; END IF;
  IF NOT EXISTS(SELECT 1 FROM silver.manage WHERE id=v_scope AND manage_role='scope') THEN RETURN; END IF;
  v_config:=to_regclass(format('silver.%I',v_scope));
  v_keywords:=to_regclass(format('silver.%I_keywords',v_scope));
  IF v_config IS NULL OR v_keywords IS NULL THEN RETURN; END IF;
  EXECUTE format('SELECT current_keyword_class_uid FROM %s WHERE id=$1',v_config)
    INTO v_class_uid USING v_scope;
  IF v_class_uid IS NULL THEN RETURN; END IF;
  IF NOT silver.can_manage_scope(v_scope) THEN
    EXECUTE format('SELECT coalesce(keyword_class_share_enabled,false) FROM %s WHERE id=$1',v_config)
      INTO v_public USING v_scope;
    IF NOT v_public THEN RETURN; END IF;
  END IF;
  RETURN QUERY EXECUTE format('SELECT keyword_id,class_group,item_name,order_no,class_enable FROM %s WHERE class_uid=$1 ORDER BY order_no,keyword_id',v_keywords)
    USING v_class_uid;
END;
$fn$;
REVOKE ALL ON FUNCTION silver.read_keyword_item_catalog(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION silver.read_keyword_item_catalog(text) TO anon,authenticated;
