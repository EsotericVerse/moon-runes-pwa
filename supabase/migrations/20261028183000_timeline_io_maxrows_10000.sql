-- Match the single JS MaxRows=10000 ceiling for Timeline RPCs.
-- Reviewed writes remain owner-only and atomic; raw Timeline GPS is never stored.
-- Timeline I/O writes: MaxRows (10000) rows per RPC, preserving owner-only review and all-or-nothing guards.
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
  IF total NOT BETWEEN 1 AND 10000 THEN
    RAISE EXCEPTION '每批只能補寫 1 至 10000 篇';
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
  -- Set-based UPDATE: one statement per batch, not 10000 separate SELECT + UPDATE loops.
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

-- Keep the earlier place_id-only RPC aligned with the same MaxRows I/O limit.
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
  IF total NOT BETWEEN 1 AND 10000 THEN
    RAISE EXCEPTION '每批只能補寫 1 至 10000 篇';
  END IF;
  IF EXISTS(
    SELECT 1 FROM jsonb_to_recordset(p_updates)
      AS u(uid text,place_id text,expected_place_id text,manual boolean)
    WHERE u.uid IS NULL OR u.uid !~ '^[A-Za-z0-9]{8}$'
       OR u.place_id IS NULL OR u.place_id !~ '^[A-Za-z0-9]{4}$'
       OR u.expected_place_id IS NOT NULL
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
     WHERE g.uid = u.uid AND NULLIF(btrim(g.place_id),'') IS NULL
  $query$,p_scope_id||'_galaxy') USING p_updates;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> total THEN
    RAISE EXCEPTION '文章的 place_id 已填寫或已變動，整批不寫入，請重新預覽';
  END IF;
  RETURN affected;
END
$fn$;

REVOKE ALL ON FUNCTION silver.apply_timeline_missing_places(text,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION silver.apply_timeline_place_ids(text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION silver.apply_timeline_missing_places(text,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION silver.apply_timeline_place_ids(text,jsonb) TO authenticated;
NOTIFY pgrst, 'reload schema';

-- Google Timeline remains transient, browser-only private evidence.
-- Timeline review reads only articles missing place_id. The place_id-only write
-- leaves source_place unchanged. Do not store visits, routes or coordinates.
CREATE OR REPLACE FUNCTION silver.preview_timeline_missing_place_windows(
 p_scope_id text,p_windows jsonb,p_limit integer DEFAULT 10000,p_offset integer DEFAULT 0)
RETURNS TABLE(article_uid text,article_title text,article_time timestamptz,
 existing_place_id text,window_index integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','silver'
AS $fn$
DECLARE total integer;
BEGIN
 IF auth.uid() IS NULL OR p_scope_id NOT IN ('lo3rwang','lrunes')
   OR NOT silver.can_manage_scope(p_scope_id) THEN
   RAISE EXCEPTION 'Timeline 預覽需要 Scope 管理權限' USING errcode='42501';
 END IF;
 IF jsonb_typeof(p_windows) IS DISTINCT FROM 'array' THEN
   RAISE EXCEPTION 'Invalid Timeline window array';
 END IF;
 total:=jsonb_array_length(p_windows);
 IF total NOT BETWEEN 1 AND 10000 OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 10000
   OR p_offset IS NULL OR p_offset<0 OR p_offset>100000 THEN
   RAISE EXCEPTION 'Timeline 預覽必須分段，每批最多 10000 個區間';
 END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_windows) a(item)
   WHERE (a.item->>'index') IS NULL OR (a.item->>'index') !~ '^[0-9]{1,6}$'
     OR (a.item->>'start_time') IS NULL
     OR (a.item->>'end_time') IS NULL
     OR (a.item->>'start_time') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T'
     OR (a.item->>'end_time') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T') THEN
   RAISE EXCEPTION 'Timeline 區間欄位錯誤';
 END IF;
 IF EXISTS(SELECT 1 FROM jsonb_to_recordset(p_windows)
   AS w(index integer,start_time timestamptz,end_time timestamptz)
   WHERE w.start_time IS NULL OR w.end_time IS NULL OR w.end_time<=w.start_time
     OR w.end_time-w.start_time>interval '12 hours') THEN
   RAISE EXCEPTION 'Timeline 區間必須為有效 12 小時以內時間';
 END IF;
 RETURN QUERY EXECUTE format($query$
   WITH w AS MATERIALIZED (
     SELECT index AS window_index,start_time,end_time
     FROM jsonb_to_recordset($1) AS j(index integer,start_time timestamptz,end_time timestamptz)
   )
   SELECT g.uid::text,g.title::text,g.createtime,g.place_id::text,w.window_index
   FROM w JOIN LATERAL (
     SELECT uid,title,createtime,place_id FROM silver.%I
     WHERE createtime>=w.start_time AND createtime<w.end_time
       AND NULLIF(btrim(place_id),'') IS NULL
     OFFSET 0
   ) g ON TRUE
   ORDER BY g.uid,w.window_index LIMIT $2 OFFSET $3
 $query$,p_scope_id||'_galaxy')
 USING p_windows,p_limit,p_offset;
END
$fn$;

REVOKE ALL ON FUNCTION silver.preview_timeline_missing_place_windows(text,jsonb,integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION silver.preview_timeline_missing_place_windows(text,jsonb,integer,integer) TO authenticated;
NOTIFY pgrst, 'reload schema';

-- JSON scalar avoids the REST API SETOF row cap for a MaxRows-size preview.
CREATE OR REPLACE FUNCTION silver.preview_timeline_place_page_json(
 p_scope_id text,p_windows jsonb,p_limit integer DEFAULT 10000,p_offset integer DEFAULT 0)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path TO 'pg_catalog','silver'
AS $fn$
 SELECT coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb)
 FROM silver.preview_timeline_missing_place_windows(p_scope_id,p_windows,p_limit,p_offset) r
$fn$;
REVOKE ALL ON FUNCTION silver.preview_timeline_place_page_json(text,jsonb,integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION silver.preview_timeline_place_page_json(text,jsonb,integer,integer) TO authenticated;
NOTIFY pgrst, 'reload schema';
