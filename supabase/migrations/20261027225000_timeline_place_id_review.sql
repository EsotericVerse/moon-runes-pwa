-- Timeline evidence is ephemeral. Neither function stores the import file,
-- coordinates, Google place identifiers, travel paths, or time-anchor records.
-- Only an explicitly reviewed LOC place_id can be written.
CREATE OR REPLACE FUNCTION silver.preview_timeline_place_windows(
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
     OR (a.item->>'start_time') !~ '^\d{4}-\d\d-\d\dT'
     OR (a.item->>'end_time') !~ '^\d{4}-\d\d-\d\dT') THEN
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
   ) g ON TRUE
   ORDER BY g.uid,w.window_index LIMIT $2 OFFSET $3
 $query$,p_scope_id||'_galaxy')
 USING p_windows,p_limit,p_offset;
END
$fn$;

CREATE OR REPLACE FUNCTION silver.apply_timeline_place_ids(
 p_scope_id text,p_updates jsonb)
RETURNS integer
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path TO 'pg_catalog','silver'
AS $fn$
DECLARE r record; n integer:=0; result_count integer; total integer;
BEGIN
 IF auth.uid() IS NULL OR p_scope_id NOT IN ('lo3rwang','lrunes')
   OR NOT silver.can_manage_scope(p_scope_id) THEN
   RAISE EXCEPTION 'Timeline 寫入需要 Scope 管理權限' USING errcode='42501';
 END IF;
 IF jsonb_typeof(p_updates) IS DISTINCT FROM 'array' THEN
   RAISE EXCEPTION 'Invalid place_id batch';
 END IF;
 total:=jsonb_array_length(p_updates);
 IF total NOT BETWEEN 1 AND 150 THEN RAISE EXCEPTION '每批只能補寫 1 至 150 篇'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_to_recordset(p_updates)
   AS u(uid text,place_id text,expected_place_id text,manual boolean)
   WHERE u.uid !~ '^[A-Za-z0-9]{8}$' OR u.place_id !~ '^[A-Za-z0-9]{4}$'
     OR (u.expected_place_id IS NOT NULL AND coalesce(u.manual,false) IS NOT TRUE)
 ) THEN RAISE EXCEPTION 'UID／place_id 格式或手動覆寫權限不正確'; END IF;
 IF (SELECT COUNT(DISTINCT u.uid) FROM
   jsonb_to_recordset(p_updates) AS u(uid text))<>total THEN
   RAISE EXCEPTION '同批文章 UID 重複';
 END IF;
 IF EXISTS(
   SELECT 1 FROM jsonb_to_recordset(p_updates) AS u(place_id text)
   WHERE NOT EXISTS(
     SELECT 1 FROM silver.lo3rwang_trace a
       WHERE p_scope_id='lo3rwang' AND a.uid=u.place_id AND a.trace_type='space_anchor'
     UNION ALL
     SELECT 1 FROM silver.lrunes_trace b
       WHERE p_scope_id='lrunes' AND b.uid=u.place_id AND b.trace_type='space_anchor'
   )
 ) THEN RAISE EXCEPTION '存在不屬於此 Scope 的空間定錨點'; END IF;
 FOR r IN SELECT * FROM jsonb_to_recordset(p_updates)
   AS u(uid text,place_id text,expected_place_id text,manual boolean)
 LOOP
   EXECUTE format('UPDATE silver.%I g SET place_id=$1
      WHERE g.uid=$2 AND g.place_id IS NOT DISTINCT FROM $3',
      p_scope_id||'_galaxy')
     USING r.place_id,r.uid,r.expected_place_id;
   GET DIAGNOSTICS result_count=ROW_COUNT;
   IF result_count<>1 THEN
     RAISE EXCEPTION '文章 % 的 place_id 已改變，整批不寫入，請重新預覽',r.uid;
   END IF;
   n:=n+1;
 END LOOP;
 RETURN n;
END
$fn$;

REVOKE ALL ON FUNCTION silver.preview_timeline_place_windows(text,jsonb,integer,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION silver.apply_timeline_place_ids(text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION silver.preview_timeline_place_windows(text,jsonb,integer,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION silver.apply_timeline_place_ids(text,jsonb) TO authenticated;
