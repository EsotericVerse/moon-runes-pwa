-- Google Timeline remains transient, browser-only private evidence.
-- These opt-in RPCs only repair empty Galaxy source_place and optionally missing
-- place_id after explicit owner review. Do not store visits, routes or coordinates.
CREATE OR REPLACE FUNCTION silver.preview_timeline_missing_place_windows(
 p_scope_id text,p_windows jsonb,p_limit integer DEFAULT 750,p_offset integer DEFAULT 0)
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
 IF total NOT BETWEEN 1 AND 40 OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 750
   OR p_offset IS NULL OR p_offset<0 OR p_offset>100000 THEN
   RAISE EXCEPTION 'Timeline 預覽必須分段，每批最多 40 個區間';
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
       AND (source_place IS NULL OR source_place ~ '^[[:space:]　]*$')
   ) g ON TRUE
   ORDER BY g.uid,w.window_index LIMIT $2 OFFSET $3
 $query$,p_scope_id||'_galaxy')
 USING p_windows,p_limit,p_offset;
END
$fn$;

CREATE OR REPLACE FUNCTION silver.apply_timeline_missing_places(
 p_scope_id text,p_updates jsonb)
RETURNS integer
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path TO 'pg_catalog','silver'
AS $fn$
DECLARE r record; n integer:=0; result_count integer; total integer;
        v_name text;
BEGIN
 IF auth.uid() IS NULL OR p_scope_id NOT IN ('lo3rwang','lrunes')
   OR NOT silver.can_manage_scope(p_scope_id) THEN
   RAISE EXCEPTION 'Timeline 寫入需要 Scope 管理權限' USING errcode='42501';
 END IF;
 IF jsonb_typeof(p_updates) IS DISTINCT FROM 'array' THEN
   RAISE EXCEPTION 'Invalid place batch';
 END IF;
 total:=jsonb_array_length(p_updates);
 IF total NOT BETWEEN 1 AND 150 THEN RAISE EXCEPTION '每批只能補寫 1 至 150 篇'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_to_recordset(p_updates)
   AS u(uid text,place_id text,expected_place_id text,manual boolean)
   WHERE u.uid IS NULL OR u.uid !~ '^[A-Za-z0-9]{8}$'
     OR u.place_id IS NULL OR u.place_id !~ '^[A-Za-z0-9]{4}$'
     OR (u.expected_place_id IS NOT NULL AND u.expected_place_id <> u.place_id)
 ) THEN RAISE EXCEPTION '無效 UID／定錨點，或試圖覆寫原有 place_id'; END IF;
 IF (SELECT COUNT(DISTINCT u.uid) FROM
   jsonb_to_recordset(p_updates) AS u(uid text))<>total THEN
   RAISE EXCEPTION '同批文章 UID 重複';
 END IF;
 FOR r IN SELECT * FROM jsonb_to_recordset(p_updates)
   AS u(uid text,place_id text,expected_place_id text,manual boolean)
 LOOP
   -- The name is read from this Scope's saved anchor, never trusted from the
   -- uploaded Timeline JSON or an arbitrary client-supplied place name.
   EXECUTE format($query$
     SELECT nullif(btrim(title),'') FROM silver.%I
     WHERE uid=$1 AND trace_type='space_anchor'
   $query$,p_scope_id||'_trace')
     INTO v_name USING r.place_id;
   IF v_name IS NULL OR length(v_name)>200 THEN
     RAISE EXCEPTION '地點 UID % 不存在、名稱空白或超過 200 字',r.place_id;
   END IF;
   EXECUTE format($query$
     UPDATE silver.%I g
     SET source_place=$1,
         place_id=COALESCE(NULLIF(btrim(g.place_id),''),$2)
     WHERE g.uid=$3
       AND NULLIF(btrim(g.place_id),'') IS NOT DISTINCT FROM $4
       AND (g.source_place IS NULL OR g.source_place ~ '^[[:space:]　]*$')
   $query$,p_scope_id||'_galaxy')
     USING v_name,r.place_id,r.uid,r.expected_place_id;
   GET DIAGNOSTICS result_count=ROW_COUNT;
   IF result_count<>1 THEN
     RAISE EXCEPTION '文章 % 原有地點或 place_id 已改變，整批不寫入，請重新預覽',r.uid;
   END IF;
   n:=n+1;
 END LOOP;
 RETURN n;
END
$fn$;

REVOKE ALL ON FUNCTION silver.preview_timeline_missing_place_windows(text,jsonb,integer,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION silver.apply_timeline_missing_places(text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION silver.preview_timeline_missing_place_windows(text,jsonb,integer,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION silver.apply_timeline_missing_places(text,jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';
