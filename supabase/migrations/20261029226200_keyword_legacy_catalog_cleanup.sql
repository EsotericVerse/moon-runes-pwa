-- Retarget every still-used reader/manager before retiring numbered catalogs.
-- The public music-style response retains its original shape and permissions.
CREATE OR REPLACE FUNCTION silver.read_music_style_tree()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'class_name',c.name,'class_group',g.name,
      'item_name',i.name,'keywords',i.lists
    ) ORDER BY c.name,gchild.ord,ichild.ord
  ),'[]'::jsonb)
  FROM silver.lo3rwang_keywords c
  CROSS JOIN LATERAL jsonb_array_elements_text(c.lists)
    WITH ORDINALITY gchild(uid,ord)
  JOIN silver.lo3rwang_keywords g ON g.uid=gchild.uid AND g.type='group'
  CROSS JOIN LATERAL jsonb_array_elements_text(g.lists)
    WITH ORDINALITY ichild(uid,ord)
  JOIN silver.lo3rwang_keywords i ON i.uid=ichild.uid AND i.type='item'
  WHERE c.type='class' AND lower(c.name)=ANY(ARRAY[
    'pop','hip-hop','vocal','rock','electronic','jazz','soul','blues',
    'folk','classical','ambient','dance','r&b','metal','reggae',
    'latin','country','funk','disco','orchestral','experimental',
    'world','punk','house','techno','trance','garage'
  ]::text[]);
$function$;

-- Scope Keywords are now self-contained. No global keyword_classes row exists.
-- Preserve the original global authorization, built-in Scope exclusion,
-- dependent-Scope protection, DROP RESTRICT and registry cleanup.
CREATE OR REPLACE FUNCTION api.delete_scope(p_scope_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
  v_scope text := lower(btrim(coalesce(p_scope_id,'')));
  v_role text;
  v_suffix text;
  v_relation text;
BEGIN
  IF NOT silver.can_manage_global() THEN
    RAISE EXCEPTION 'Global Admin permission required';
  END IF;
  IF v_scope !~ '^[a-z][a-z0-9]{0,14}$' THEN
    RAISE EXCEPTION 'invalid Scope ID';
  END IF;
  IF v_scope IN ('loc','lrunes','lo3rwang','admin') THEN
    RAISE EXCEPTION 'Cannot delete a built-in Scope';
  END IF;
  SELECT manage_role INTO v_role FROM silver.manage
  WHERE id=v_scope FOR UPDATE;
  IF NOT FOUND OR v_role<>'scope' THEN
    RAISE EXCEPTION 'Only an existing non-system Scope may be deleted';
  END IF;
  IF EXISTS(SELECT 1 FROM silver.manage WHERE parent_scope_id=v_scope) THEN
    RAISE EXCEPTION 'Scope has child Registry entries';
  END IF;
  FOREACH v_suffix IN ARRAY ARRAY[
    '_galaxy_media','_galaxy','_time','_keywords','_blocks',''
  ] LOOP
    v_relation:=format('silver.%I',v_scope||v_suffix);
    IF to_regclass(v_relation) IS NULL THEN
      RAISE EXCEPTION 'Expected Scope table % is missing',v_relation;
    END IF;
    EXECUTE 'DROP TABLE '||v_relation||' RESTRICT';
  END LOOP;
  DELETE FROM silver.manage WHERE id=v_scope;
  RETURN jsonb_build_object('scope_id',v_scope,'deleted',true);
END;
$function$;

-- The original numbered catalogs have no remaining active consumers.
-- Never CASCADE: fail safely if any further database dependency exists.
DROP TABLE IF EXISTS silver.lo3rwang_keywords_legacy;
DROP TABLE IF EXISTS silver.lrunes_keywords_legacy;
DROP TABLE IF EXISTS silver.keyword_classes;
DROP FUNCTION IF EXISTS silver.new_keyword_class_uid();
NOTIFY pgrst,'reload schema';
