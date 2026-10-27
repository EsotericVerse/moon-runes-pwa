-- Cached autocomplete rankings are Scope-local configuration, not live-query state.
-- Refresh explicitly after large imports or from the Scope management UI.
DO $migration$
DECLARE s record;
BEGIN
  FOR s IN SELECT id FROM silver.manage WHERE manage_role='scope' AND id ~ '^[a-z][a-z0-9]{0,14}$' LOOP
    IF to_regclass(format('silver.%I',s.id)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE silver.%I ADD COLUMN IF NOT EXISTS autocomplete_current jsonb',s.id);
    END IF;
  END LOOP;
  ALTER TABLE silver.loc ADD COLUMN IF NOT EXISTS autocomplete_current jsonb;
END $migration$;

CREATE OR REPLACE FUNCTION silver.refresh_scope_autocomplete_current(p_scope_id text)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY INVOKER
SET search_path TO 'pg_catalog','silver'
AS $fn$
DECLARE
  v_id text := lower(btrim(coalesce(p_scope_id,'')));
  v_galaxy regclass;
  v_trace regclass;
  v_time regclass;
  v_config regclass;
  v_places jsonb := '[]'::jsonb;
  v_days jsonb := '[]'::jsonb;
  v_events jsonb := '[]'::jsonb;
  v_result jsonb;
BEGIN
  IF v_id !~ '^[a-z][a-z0-9]{0,14}$' OR v_id IN ('admin','local') THEN
    RAISE EXCEPTION 'Invalid Scope id' USING errcode='22023';
  END IF;
  IF v_id <> 'loc' AND NOT EXISTS (
    SELECT 1 FROM silver.manage WHERE id=v_id AND manage_role='scope'
  ) THEN
    RAISE EXCEPTION 'Unknown Scope' USING errcode='22023';
  END IF;
  IF NOT (CASE WHEN v_id='loc' THEN silver.can_manage_global() ELSE silver.can_manage_scope(v_id) END) THEN
    RAISE EXCEPTION 'Not authorized to refresh Scope suggestions' USING errcode='42501';
  END IF;
  v_config:=to_regclass(format('silver.%I',v_id));
  v_galaxy:=to_regclass(format('silver.%I',v_id||'_galaxy'));
  v_trace:=to_regclass(format('silver.%I',v_id||'_trace'));
  v_time:=to_regclass(format('silver.%I',v_id||'_time'));
  IF v_config IS NULL THEN RAISE EXCEPTION 'Scope config missing'; END IF;

  IF v_galaxy IS NOT NULL AND v_trace IS NOT NULL THEN
    EXECUTE format($places$
      WITH frequencies AS (
        SELECT nullif(btrim(g.place_id),'') AS anchor_uid,
          nullif(btrim(g.source_place),'') AS place_name,
          count(*)::bigint AS hits
        FROM %s g
        WHERE g.statistics_able IS TRUE AND g.searchable IS TRUE
          AND g.content <> '' AND (nullif(btrim(g.place_id),'') IS NOT NULL
            OR nullif(btrim(g.source_place),'') IS NOT NULL)
        GROUP BY 1,2
      ), id_counts AS (
        SELECT anchor_uid,sum(hits)::bigint hits FROM frequencies
        WHERE anchor_uid IS NOT NULL GROUP BY anchor_uid
      ), name_counts AS (
        SELECT place_name,sum(hits)::bigint hits FROM frequencies
        WHERE anchor_uid IS NULL AND place_name IS NOT NULL GROUP BY place_name
      ), anchors AS (
        SELECT a.uid::text uid,a.title::text title,
          count(*) OVER (PARTITION BY a.title) AS name_matches
        FROM %s a WHERE a.trace_type='space_anchor'
      ), ranked AS (
        SELECT a.uid,a.title,
          (coalesce(i.hits,0)+CASE WHEN a.name_matches=1 THEN coalesce(n.hits,0) ELSE 0 END)::bigint hits
        FROM anchors a LEFT JOIN id_counts i ON i.anchor_uid=a.uid
          LEFT JOIN name_counts n ON n.place_name=a.title
      )
      SELECT coalesce(jsonb_agg(jsonb_build_object('uid',uid,'title',title,'count',hits)
        ORDER BY hits DESC,title,uid),'[]'::jsonb) FROM ranked
      WHERE hits>0
    $places$,v_galaxy,v_trace) INTO v_places;
  END IF;

  IF v_galaxy IS NOT NULL AND v_time IS NOT NULL THEN
    EXECUTE format($days$
      WITH frequencies AS (
        SELECT (g.createtime AT TIME ZONE 'Asia/Taipei')::date AS anchor_day,
          count(*)::bigint hits
        FROM %s g
        WHERE g.statistics_able IS TRUE AND g.searchable IS TRUE
          AND g.content <> '' AND g.createtime IS NOT NULL
        GROUP BY 1
      ), ranked AS (
        SELECT a.uid::text uid,a.title::text title,a.address::text AS anchor_day,
          coalesce(f.hits,0)::bigint hits
        FROM %s a LEFT JOIN frequencies f ON f.anchor_day=a.address
        WHERE a.type='anchor'
      )
      SELECT coalesce(jsonb_agg(jsonb_build_object('uid',uid,'title',title,'date',anchor_day,'count',hits)
        ORDER BY hits DESC,anchor_day,uid),'[]'::jsonb) FROM ranked
      WHERE hits>0
    $days$,v_galaxy,v_time) INTO v_days;
  END IF;

  IF v_time IS NOT NULL THEN
    EXECUTE format($events$
      WITH usage AS (
        SELECT unnest(anchor_ids) AS event_uid
        FROM %s WHERE type='time_trace'
      ), ranked AS (
        SELECT e.uid::text uid,e.title::text title,count(u.event_uid)::bigint hits
        FROM %s e LEFT JOIN usage u ON u.event_uid=e.uid
        WHERE e.type='time_period'
        GROUP BY e.uid,e.title
      )
      SELECT coalesce(jsonb_agg(jsonb_build_object('uid',uid,'title',title,'count',hits)
        ORDER BY hits DESC,title,uid),'[]'::jsonb) FROM ranked WHERE hits>0
    $events$,v_time,v_time) INTO v_events;
  END IF;

  v_result:=jsonb_build_object('space',v_places,'time',v_days,'event',v_events,
    'updated_at',to_char(now() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"'));
  EXECUTE format('UPDATE %s SET autocomplete_current=$1 WHERE id=$2 RETURNING autocomplete_current',v_config)
    INTO v_result USING v_result,v_id;
  IF v_result IS NULL THEN RAISE EXCEPTION 'Scope config row missing'; END IF;
  RETURN v_result;
END;
$fn$;
REVOKE ALL ON FUNCTION silver.refresh_scope_autocomplete_current(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION silver.refresh_scope_autocomplete_current(text) TO authenticated;
