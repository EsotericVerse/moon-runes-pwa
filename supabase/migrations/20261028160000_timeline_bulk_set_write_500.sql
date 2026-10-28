-- Timeline I/O writes: 500 rows per RPC, preserving owner-only review and all-or-nothing guards.
-- Google Timeline stays in browser memory. Do not persist visit records or raw coordinates.
CREATE OR REPLACE FUNCTION silver.apply_timeline_missing_places(p_scope_id text, p_updates jsonb)
RETURNS integer
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path TO 'pg_catalog','silver'
AS $fn$
DECLARE
  total integer;
  eligible integer;
  affected integer;
BEGIN
  IF auth.uid() IS NULL OR p_scope_id NOT IN ('lo3rwang','lrunes')
    OR NOT silver.can_manage_scope(p_scope_id) THEN
    RAISE EXCEPTION 'Timeline 寫入需要 Scope 管理權限' USING errcode='42501';
  END IF;
  IF jsonb_typeof(p_updates) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Invalid place batch';
  END IF;
  total := jsonb_array_length(p_updates);
  IF total NOT BETWEEN 1 AND 500 THEN
    RAISE EXCEPTION '每批只能補寫 1 至 500 篇';
  END IF;
  IF EXISTS(
    SELECT 1 FROM jsonb_to_recordset(p_updates)
      AS u(uid text,place_id text,expected_place_id text,manual boolean)
    WHERE u.uid IS NULL OR u.uid !~ '^[A-Za-z0-9]{8}$'
       OR u.place_id IS NULL OR u.place_id !~ '^[A-Za-z0-9]{4}$'
       OR (u.expected_place_id IS NOT NULL AND u.expected_place_id <> u.place_id)
  ) THEN
    RAISE EXCEPTION '無效 UID／定錨點，或試圖覆寫原有 place_id';
  END IF;
  IF (SELECT count(DISTINCT uid) FROM jsonb_to_recordset(p_updates) AS u(uid text)) <> total THEN
    RAISE EXCEPTION '同批文章 UID 重複';
  END IF;
  -- Resolve only existing anchors inside the authorized Scope. Never use names from Timeline JSON.
  EXECUTE format($query$
    SELECT count(*)
      FROM jsonb_to_recordset($1) AS u(place_id text)
      JOIN silver.%I a ON a.uid = u.place_id AND a.trace_type = 'space_anchor'
     WHERE length(btrim(a.title)) BETWEEN 1 AND 200
  $query$,p_scope_id||'_trace') INTO eligible USING p_updates;
  IF eligible <> total THEN
    RAISE EXCEPTION '部分地點不存在、名稱空白或超過 200 字，整批不寫入';
  END IF;
  -- Set-based UPDATE: one statement per batch, not 500 separate SELECT + UPDATE loops.
  EXECUTE format($query$
    UPDATE silver.%I g
       SET source_place = btrim(a.title),
           place_id = COALESCE(NULLIF(btrim(g.place_id),''),u.place_id)
      FROM jsonb_to_recordset($1)
        AS u(uid text,place_id text,expected_place_id text,manual boolean)
      JOIN silver.%I a ON a.uid = u.place_id AND a.trace_type = 'space_anchor'
     WHERE g.uid = u.uid
       AND NULLIF(btrim(g.place_id),'') IS NOT DISTINCT FROM u.expected_place_id
       AND (g.source_place IS NULL OR g.source_place ~ '^[[:space:]　]*$')
  $query$,p_scope_id||'_galaxy',p_scope_id||'_trace') USING p_updates;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> total THEN
    RAISE EXCEPTION '文章原有地點或 place_id 已改變，整批不寫入，請重新預覽';
  END IF;
  RETURN affected;
END
$fn$;

-- Keep the earlier place_id-only RPC aligned with the same 500-row I/O limit.
CREATE OR REPLACE FUNCTION silver.apply_timeline_place_ids(p_scope_id text,p_updates jsonb)
RETURNS integer
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path TO 'pg_catalog','silver'
AS $fn$
DECLARE
  total integer;
  eligible integer;
  affected integer;
BEGIN
  IF auth.uid() IS NULL OR p_scope_id NOT IN ('lo3rwang','lrunes')
    OR NOT silver.can_manage_scope(p_scope_id) THEN
    RAISE EXCEPTION 'Timeline 寫入需要 Scope 管理權限' USING errcode='42501';
  END IF;
  IF jsonb_typeof(p_updates) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Invalid place_id batch';
  END IF;
  total := jsonb_array_length(p_updates);
  IF total NOT BETWEEN 1 AND 500 THEN
    RAISE EXCEPTION '每批只能補寫 1 至 500 篇';
  END IF;
  IF EXISTS(
    SELECT 1 FROM jsonb_to_recordset(p_updates)
      AS u(uid text,place_id text,expected_place_id text,manual boolean)
    WHERE u.uid IS NULL OR u.uid !~ '^[A-Za-z0-9]{8}$'
       OR u.place_id IS NULL OR u.place_id !~ '^[A-Za-z0-9]{4}$'
       OR (u.expected_place_id IS NOT NULL AND coalesce(u.manual,false) IS NOT TRUE)
  ) THEN
    RAISE EXCEPTION 'UID／place_id 格式或手動覆寫權限不正確';
  END IF;
  IF (SELECT count(DISTINCT uid) FROM jsonb_to_recordset(p_updates) AS u(uid text)) <> total THEN
    RAISE EXCEPTION '同批文章 UID 重複';
  END IF;
  EXECUTE format($query$
    SELECT count(*)
      FROM jsonb_to_recordset($1) AS u(place_id text)
      JOIN silver.%I a ON a.uid = u.place_id AND a.trace_type = 'space_anchor'
  $query$,p_scope_id||'_trace') INTO eligible USING p_updates;
  IF eligible <> total THEN
    RAISE EXCEPTION '存在不屬於此 Scope 的空間定錨點';
  END IF;
  EXECUTE format($query$
    UPDATE silver.%I g SET place_id = u.place_id
      FROM jsonb_to_recordset($1)
        AS u(uid text,place_id text,expected_place_id text,manual boolean)
     WHERE g.uid = u.uid AND g.place_id IS NOT DISTINCT FROM u.expected_place_id
  $query$,p_scope_id||'_galaxy') USING p_updates;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> total THEN
    RAISE EXCEPTION '文章的 place_id 已改變，整批不寫入，請重新預覽';
  END IF;
  RETURN affected;
END
$fn$;

REVOKE ALL ON FUNCTION silver.apply_timeline_missing_places(text,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION silver.apply_timeline_place_ids(text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION silver.apply_timeline_missing_places(text,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION silver.apply_timeline_place_ids(text,jsonb) TO authenticated;
NOTIFY pgrst, 'reload schema';
