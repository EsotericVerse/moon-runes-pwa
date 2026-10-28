CREATE OR REPLACE FUNCTION silver.rename_scope_source_name_batch(
  p_scope_id text,p_before text,p_after text,p_batch_size integer DEFAULT 1000
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE v_galaxy regclass; v_affected integer;
BEGIN
  IF auth.uid() IS NULL OR coalesce(p_scope_id,'') !~ '^[a-z][a-z0-9]{0,14}$'
    OR NOT silver.can_manage_scope(p_scope_id) THEN
    RAISE EXCEPTION 'Scope source correction permission denied';
  END IF;
  IF p_before IS NULL OR p_after IS NULL OR btrim(p_before)='' OR btrim(p_after)=''
    OR length(btrim(p_before))>80 OR length(btrim(p_after))>80
    OR btrim(p_before)=btrim(p_after) THEN
    RAISE EXCEPTION 'Invalid source name correction';
  END IF;
  IF p_batch_size IS NULL OR p_batch_size<1 OR p_batch_size>1000 THEN
    RAISE EXCEPTION 'Invalid batch size';
  END IF;
  v_galaxy:=to_regclass(format('silver.%I',p_scope_id||'_galaxy'));
  IF v_galaxy IS NULL THEN RAISE EXCEPTION 'Unknown Scope Galaxy'; END IF;
  EXECUTE format($sql$
    WITH targets AS (
      SELECT uid FROM %1$s WHERE source_name=$1 ORDER BY uid LIMIT $3 FOR UPDATE SKIP LOCKED
    )
    UPDATE %1$s AS galaxy SET source_name=$2 FROM targets WHERE galaxy.uid=targets.uid
  $sql$,v_galaxy)
    USING btrim(p_before),btrim(p_after),p_batch_size;
  GET DIAGNOSTICS v_affected=ROW_COUNT;
  RETURN v_affected;
END;
$$;
REVOKE ALL ON FUNCTION silver.rename_scope_source_name_batch(text,text,text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION silver.rename_scope_source_name_batch(text,text,text,integer) TO authenticated;
