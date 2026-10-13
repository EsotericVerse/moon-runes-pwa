-- Atomic per-page reorder of two neighboring, stored Scope blocks.
-- No numerical sort UI, no corpus read, and no reparenting of child entities.
CREATE OR REPLACE FUNCTION api.move_scope_block(
  p_scope_id text, p_page_name text, p_uid text, p_direction integer
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
  v_scope text := lower(btrim(coalesce(p_scope_id,'')));
  v_page text := lower(btrim(coalesce(p_page_name,'')));
  v_uid text := btrim(coalesce(p_uid,''));
  v_table regclass;
  v_order integer;
  v_neighbor_uid text;
  v_neighbor_order integer;
  v_count integer;
BEGIN
  IF v_scope !~ '^[a-z][a-z0-9]{0,14}$' THEN RAISE EXCEPTION 'Invalid Scope ID'; END IF;
  IF v_page='' OR length(v_page)>80 THEN RAISE EXCEPTION 'Invalid page name'; END IF;
  IF v_uid !~ '^[A-Za-z0-9]{8}$' THEN RAISE EXCEPTION 'Invalid block UID'; END IF;
  IF p_direction NOT IN (-1,1) OR p_direction IS NULL THEN RAISE EXCEPTION 'Direction must be -1 or 1'; END IF;
  IF NOT (
    CASE WHEN v_scope='loc' THEN silver.can_manage_global()
    ELSE silver.can_manage_scope(v_scope) END
  ) THEN RAISE EXCEPTION 'Scope management permission denied'; END IF;
  v_table := to_regclass(format('silver.%I',v_scope||'_blocks'));
  IF v_table IS NULL THEN RAISE EXCEPTION 'Scope Blocks table not found'; END IF;
  -- Serialise swaps of any two blocks on the same page.
  PERFORM pg_advisory_xact_lock(hashtext(v_scope),hashtext(v_page));
  EXECUTE format('SELECT block_order FROM %s WHERE uid=$1 AND page_name=$2',v_table)
    INTO v_order USING v_uid,v_page;
  IF v_order IS NULL THEN RAISE EXCEPTION 'Block not found on requested page'; END IF;
  IF p_direction=-1 THEN
    EXECUTE format('SELECT uid::text,block_order FROM %s
      WHERE page_name=$1 AND block_order<$2 ORDER BY block_order DESC,uid DESC LIMIT 1',v_table)
      INTO v_neighbor_uid,v_neighbor_order USING v_page,v_order;
  ELSE
    EXECUTE format('SELECT uid::text,block_order FROM %s
      WHERE page_name=$1 AND block_order>$2 ORDER BY block_order ASC,uid ASC LIMIT 1',v_table)
      INTO v_neighbor_uid,v_neighbor_order USING v_page,v_order;
  END IF;
  IF v_neighbor_uid IS NULL THEN RAISE EXCEPTION 'Block is already at page boundary'; END IF;
  EXECUTE format('UPDATE %s SET block_order=CASE WHEN uid=$1 THEN $3 ELSE $4 END
                  WHERE page_name=$5 AND uid IN ($1,$2)',v_table)
    USING v_uid,v_neighbor_uid,v_neighbor_order,v_order,v_page;
  GET DIAGNOSTICS v_count=ROW_COUNT;
  IF v_count<>2 THEN RAISE EXCEPTION 'Block reorder incomplete: % rows',v_count; END IF;
  RETURN jsonb_build_object('uid',v_uid,'block_order',v_neighbor_order,'neighbor_uid',v_neighbor_uid,'neighbor_order',v_order);
END;
$function$;
REVOKE ALL ON FUNCTION api.move_scope_block(text,text,text,integer) FROM PUBLIC,anonymous;
GRANT EXECUTE ON FUNCTION api.move_scope_block(text,text,text,integer) TO authenticated;
CREATE OR REPLACE FUNCTION silver.move_scope_block(
  p_scope_id text,p_page_name text,p_uid text,p_direction integer
) RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path TO ''
AS $function$ SELECT api.move_scope_block(p_scope_id,p_page_name,p_uid,p_direction) $function$;
REVOKE ALL ON FUNCTION silver.move_scope_block(text,text,text,integer) FROM PUBLIC,anonymous;
GRANT EXECUTE ON FUNCTION silver.move_scope_block(text,text,text,integer) TO authenticated;
