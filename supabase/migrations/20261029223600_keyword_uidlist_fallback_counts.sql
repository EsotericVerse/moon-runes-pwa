-- New Keywords statistics are derived from per-Item uidlist arrays.
-- They never read or modify galaxy.class_id or galaxy.group_lists.
-- Only the currently selected Class is exposed, matching existing public charts.
CREATE OR REPLACE FUNCTION silver.read_keyword_uidlist_summary(
  p_scope_id text,p_start date DEFAULT NULL,p_end date DEFAULT NULL,p_source text DEFAULT NULL
) RETURNS TABLE(kind text,item_key text,class_id integer,day text,hit_count bigint,document_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO ''
AS $fn$
DECLARE
  v_scope text := lower(btrim(coalesce(p_scope_id,'')));
  v_class_uid text;
  v_config regclass;
  v_galaxy regclass;
  v_keywords regclass;
BEGIN
  IF v_scope !~ '^[a-z][a-z0-9]{0,14}$' THEN RAISE EXCEPTION 'Invalid Scope ID'; END IF;
  IF NOT EXISTS(SELECT 1 FROM silver.manage WHERE id=v_scope AND manage_role='scope')
    THEN RAISE EXCEPTION 'Unknown Scope'; END IF;
  v_config:=to_regclass(format('silver.%I',v_scope));
  v_galaxy:=to_regclass(format('silver.%I_galaxy',v_scope));
  v_keywords:=to_regclass(format('silver.%I_keywords',v_scope));
  IF v_config IS NULL OR v_galaxy IS NULL OR v_keywords IS NULL
    THEN RAISE EXCEPTION 'Missing Keywords relations'; END IF;
  EXECUTE format('SELECT current_keyword_class_uid FROM %s WHERE id=$1',v_config)
    INTO v_class_uid USING v_scope;
  IF v_class_uid IS NULL THEN RETURN; END IF;

  RETURN QUERY EXECUTE format($query$
    WITH catalog AS MATERIALIZED (
      SELECT keyword_id::text AS id, class_group AS grp,order_no,uidlist
      FROM %1$s
      WHERE class_uid=$1 AND class_enable IS DISTINCT FROM false
    ), default_group AS (
      SELECT k.class_group AS grp FROM %1$s k
      JOIN silver.keyword_classes c ON c.default_keyword_id=k.keyword_id
      WHERE c.class_uid=$1 LIMIT 1
    ), group_ranks AS (
      SELECT grp, row_number() OVER(
        ORDER BY CASE WHEN grp=(SELECT grp FROM default_group) THEN 1 ELSE 0 END,
          min_order,grp
      )::int AS cid
      FROM (SELECT grp,min(order_no) AS min_order FROM catalog GROUP BY grp) g
    ), hits AS (
      SELECT k.id,k.grp,j.value->>'uid' AS uid,(j.value->>'times')::bigint AS times
      FROM catalog k CROSS JOIN LATERAL jsonb_array_elements(k.uidlist) j(value)
    ), base AS MATERIALIZED (
      SELECT h.*,coalesce(g.date::text,(g.createtime AT TIME ZONE 'Asia/Taipei')::date::text) AS d
      FROM hits h JOIN %2$s g ON g.uid::text=h.uid
      WHERE g.searchable IS TRUE AND g.statistics_able IS TRUE
        AND ($2 IS NULL OR g.date >= $2) AND ($3 IS NULL OR g.date <= $3)
        AND ($4 IS NULL OR g.site=$4)
    ), group_winners AS (
      SELECT b.uid,b.d,gr.cid,sum(b.times) AS strength
      FROM base b JOIN group_ranks gr ON gr.grp=b.grp
      GROUP BY b.uid,b.d,gr.cid
    ), ranked AS (
      SELECT uid,d,cid,
        row_number() OVER(
          PARTITION BY uid,d ORDER BY strength DESC,
          CASE WHEN cid=(SELECT gr.cid FROM group_ranks gr
                         JOIN default_group df ON df.grp=gr.grp LIMIT 1)
               THEN 0 ELSE 1 END,cid
        ) AS rn
      FROM group_winners
    )
    SELECT 'eligible'::text,NULL::text,NULL::integer,''::text,
           count(DISTINCT uid)::bigint,count(DISTINCT uid)::bigint FROM base
    UNION ALL
    SELECT 'class_day',NULL,cid,d,count(*)::bigint,count(*)::bigint
      FROM ranked WHERE rn=1 GROUP BY cid,d
    UNION ALL
    SELECT 'item',id,NULL,''::text,sum(times)::bigint,count(DISTINCT uid)::bigint
      FROM base WHERE times>0 GROUP BY id
    UNION ALL
    SELECT 'item_day',id,NULL,d,sum(times)::bigint,count(DISTINCT uid)::bigint
      FROM base WHERE times>0 GROUP BY id,d
    UNION ALL
    SELECT 'keyword_all_day',NULL,NULL,d,count(DISTINCT uid)::bigint,count(DISTINCT uid)::bigint
      FROM base WHERE times>0 GROUP BY d
    UNION ALL
    SELECT 'group_items_day',grp,NULL,d,count(DISTINCT uid)::bigint,count(DISTINCT uid)::bigint
      FROM base WHERE times>0 GROUP BY grp,d
  $query$,v_keywords,v_galaxy)
  USING v_class_uid,p_start,p_end,nullif(p_source,'');
END
$fn$;
-- Restrict executable schema function to the same roles that read aggregate stats.
REVOKE ALL ON FUNCTION silver.read_keyword_uidlist_summary(text,date,date,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION silver.read_keyword_uidlist_summary(text,date,date,text) TO anon,authenticated;

