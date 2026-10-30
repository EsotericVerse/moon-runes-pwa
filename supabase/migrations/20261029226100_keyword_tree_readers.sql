-- Class sharing is persisted only in the existing Scope configuration JSONB.
-- Shared category identity is derived from Scope ID + Class UID (SHA-256).
-- No lookup, staging, snapshot or cache tables are created.
CREATE OR REPLACE FUNCTION silver.keyword_class_is_shared(p_scope_id text,p_class_uid text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $fn$
DECLARE
 v_scope text:=lower(btrim(coalesce(p_scope_id,'')));
 v_config regclass;
 v_meta jsonb;
BEGIN
 IF v_scope !~ '^[a-z][a-z0-9]{0,14}$'
    OR p_class_uid !~ '^[A-Za-z0-9]{4}$' THEN RETURN false; END IF;
 v_config:=to_regclass(format('silver.%I',v_scope));
 IF v_config IS NULL THEN RETURN false; END IF;
 EXECUTE format('SELECT keyword_meta FROM %s WHERE id=$1',v_config)
   INTO v_meta USING v_scope;
 RETURN coalesce((v_meta->'class_shares'->>p_class_uid)::boolean,false);
END
$fn$;
REVOKE ALL ON FUNCTION silver.keyword_class_is_shared(text,text) FROM PUBLIC;

-- All three consumers read the same six-column UID tree.
-- Public responses contain only aggregates or metadata, never raw uid_lists.
CREATE OR REPLACE FUNCTION silver.read_keyword_tree_summary(
  p_scope_id text,p_start date DEFAULT NULL,p_end date DEFAULT NULL,
  p_source text DEFAULT NULL,p_class_uid text DEFAULT NULL
) RETURNS TABLE(kind text,item_key text,group_uid text,day text,hit_count bigint,document_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $fn$
DECLARE
 v_scope text:=lower(btrim(coalesce(p_scope_id,'')));
 v_config regclass;
 v_keywords regclass;
 v_galaxy regclass;
 v_class text;
 v_current text;
 v_meta jsonb;
 v_old_done timestamptz;
 v_done timestamptz;
 v_public boolean:=false;
BEGIN
 IF v_scope !~ '^[a-z][a-z0-9]{0,14}$' OR NOT EXISTS(
   SELECT 1 FROM silver.manage WHERE id=v_scope AND manage_role='scope' AND active)
   THEN RAISE EXCEPTION 'Invalid Scope'; END IF;
 v_config:=to_regclass(format('silver.%I',v_scope));
 v_keywords:=to_regclass(format('silver.%I_keywords',v_scope));
 v_galaxy:=to_regclass(format('silver.%I_galaxy',v_scope));
 IF v_config IS NULL OR v_keywords IS NULL OR v_galaxy IS NULL THEN RETURN; END IF;
 EXECUTE format('SELECT current_keyword_class_uid,keyword_meta,staticstime FROM %s WHERE id=$1',v_config)
 INTO v_current,v_meta,v_old_done USING v_scope;
 v_class:=coalesce(nullif(p_class_uid,''),v_current);
 IF v_class IS NULL OR v_class !~ '^[A-Za-z0-9]{4}$' THEN RETURN; END IF;
 IF v_meta->'by_class'->v_class->>'completedAt' IS NOT NULL THEN
   v_done:=(v_meta->'by_class'->v_class->>'completedAt')::timestamptz;
 ELSIF v_class=v_current AND v_meta->>'class_uid'=v_class THEN
   v_done:=v_old_done;
 END IF;
 IF v_done IS NULL THEN RETURN; END IF;
 IF NOT silver.can_manage_scope(v_scope) AND
   NOT silver.keyword_class_is_shared(v_scope,v_class) THEN RETURN; END IF;
 RETURN QUERY EXECUTE format($query$
   WITH clazz AS (SELECT uid,lists FROM %1$s WHERE type='class' AND uid=$1),
   groups AS MATERIALIZED (
     SELECT g.uid::text AS uid,g.name,g.lists,g.uid_lists,c.order_no
     FROM clazz
     CROSS JOIN LATERAL jsonb_array_elements_text(clazz.lists) WITH ORDINALITY c(uid,order_no)
     JOIN %1$s g ON g.uid=c.uid AND g.type='group'
   ), items AS MATERIALIZED (
     SELECT i.uid::text AS uid,g.uid::text AS group_uid,i.uid_lists
     FROM groups g
     CROSS JOIN LATERAL jsonb_array_elements_text(g.lists) iid(uid)
     JOIN %1$s i ON i.uid=iid.uid AND i.type='item'
   ), group_hits AS MATERIALIZED (
     SELECT g.uid AS group_uid,article.uid::text AS article_uid,article.date::text AS d
     FROM groups g
     CROSS JOIN LATERAL jsonb_array_elements_text(g.uid_lists) a(uid)
     JOIN %2$s article ON article.uid::text=a.uid
     WHERE article.searchable IS TRUE AND article.statistics_able IS TRUE
      AND ($2 IS NULL OR article.date >= $2) AND ($3 IS NULL OR article.date <= $3)
      AND ($4 IS NULL OR article.site=$4)
   ), item_hits AS MATERIALIZED (
     SELECT i.uid AS item_uid,i.group_uid,article.uid::text AS article_uid,
       article.date::text AS d,(h.entry->>'times')::bigint AS times
     FROM items i
     CROSS JOIN LATERAL jsonb_array_elements(i.uid_lists) h(entry)
     JOIN %2$s article ON article.uid::text=h.entry->>'uid'
     WHERE article.searchable IS TRUE AND article.statistics_able IS TRUE
      AND ($2 IS NULL OR article.date >= $2) AND ($3 IS NULL OR article.date <= $3)
      AND ($4 IS NULL OR article.site=$4)
   )
   SELECT 'eligible',NULL,NULL,'',count(DISTINCT article_uid),count(DISTINCT article_uid) FROM group_hits
   UNION ALL
   SELECT 'class_day',NULL,group_uid,d,count(DISTINCT article_uid),count(DISTINCT article_uid)
    FROM group_hits GROUP BY group_uid,d
   UNION ALL
   SELECT 'item',item_uid,group_uid,'',sum(times),count(DISTINCT article_uid)
    FROM item_hits WHERE times>0 GROUP BY item_uid,group_uid
   UNION ALL
   SELECT 'item_day',item_uid,group_uid,d,sum(times),count(DISTINCT article_uid)
    FROM item_hits WHERE times>0 GROUP BY item_uid,group_uid,d
   UNION ALL
   SELECT 'keyword_all_day',NULL,NULL,d,count(DISTINCT article_uid),count(DISTINCT article_uid)
    FROM item_hits WHERE times>0 GROUP BY d
   UNION ALL
   SELECT 'group_items_day',NULL,group_uid,d,count(DISTINCT article_uid),count(DISTINCT article_uid)
    FROM item_hits WHERE times>0 GROUP BY group_uid,d
 $query$,v_keywords,v_galaxy)
 USING v_class,p_start,p_end,nullif(p_source,'');
END
$fn$;
REVOKE ALL ON FUNCTION silver.read_keyword_tree_summary(text,date,date,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION silver.read_keyword_tree_summary(text,date,date,text,text) TO anon,authenticated;

CREATE OR REPLACE FUNCTION silver.read_keyword_tree_catalog(p_scope_id text,p_class_uid text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $fn$
DECLARE
 v_scope text:=lower(btrim(coalesce(p_scope_id,'')));
 v_class text;
 v_current text;
 v_config regclass;
 v_keywords regclass;
 v_result jsonb;
 v_public boolean:=false;
BEGIN
 IF v_scope !~ '^[a-z][a-z0-9]{0,14}$' OR NOT EXISTS(
    SELECT 1 FROM silver.manage WHERE id=v_scope AND manage_role='scope' AND active)
    THEN RETURN '{}'::jsonb; END IF;
 v_config:=to_regclass(format('silver.%I',v_scope));
 v_keywords:=to_regclass(format('silver.%I_keywords',v_scope));
 IF v_config IS NULL OR v_keywords IS NULL THEN RETURN '{}'::jsonb; END IF;
 EXECUTE format('SELECT current_keyword_class_uid FROM %s WHERE id=$1',v_config)
  INTO v_current USING v_scope;
 v_class:=coalesce(nullif(p_class_uid,''),v_current);
 IF v_class IS NULL OR v_class !~ '^[A-Za-z0-9]{4}$' THEN RETURN '{}'::jsonb; END IF;
 IF NOT silver.can_manage_scope(v_scope) AND
   NOT silver.keyword_class_is_shared(v_scope,v_class) THEN RETURN '{}'::jsonb; END IF;
 EXECUTE format($query$
 WITH cl AS (SELECT uid,type,name,"desc",lists FROM %s WHERE uid=$1 AND type='class'),
 group_nodes AS (
  SELECT g.uid,g.type,g.name,g."desc",g.lists
  FROM cl CROSS JOIN LATERAL jsonb_array_elements_text(cl.lists) child(uid)
  JOIN %s g ON g.uid=child.uid AND g.type='group'
 ), item_nodes AS (
  -- Item descriptions can contain unpublished rules and private meanings.
  -- Public catalog needs only the UID and label for Culture/Statistics.
  SELECT i.uid,i.type,i.name,''::text AS "desc"
  FROM group_nodes g CROSS JOIN LATERAL jsonb_array_elements_text(g.lists) child(uid)
  JOIN %s i ON i.uid=child.uid AND i.type='item'
 ), members AS (
  SELECT uid,type,name,"desc",lists FROM cl
  UNION ALL SELECT uid,type,name,"desc",lists FROM group_nodes
  UNION ALL SELECT uid,type,name,"desc",'[]'::jsonb FROM item_nodes
 )
 SELECT jsonb_build_object('class_uid',$1,'rows',coalesce(
  jsonb_agg(jsonb_build_object('uid',uid,'type',type,'name',name,'desc',"desc",
    'lists',lists,'uid_lists','[]'::jsonb)),'[]'::jsonb))
 FROM members
 $query$,v_keywords,v_keywords,v_keywords) INTO v_result USING v_class;
 RETURN coalesce(v_result,'{}'::jsonb);
END
$fn$;
REVOKE ALL ON FUNCTION silver.read_keyword_tree_catalog(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION silver.read_keyword_tree_catalog(text,text) TO anon,authenticated;

-- Read-only shared keyword directory: owner sees native Class UID; external
-- consumers see a deterministic SHA-256 category identifier. No new rows.
CREATE OR REPLACE FUNCTION silver.read_shared_keyword_classes(p_scope_id text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $fn$
DECLARE
 v_scope text:=lower(btrim(coalesce(p_scope_id,'')));
 v_keywords regclass;
 v_result jsonb;
 v_owner boolean;
BEGIN
 IF v_scope !~ '^[a-z][a-z0-9]{0,14}$' OR NOT EXISTS(
   SELECT 1 FROM silver.manage WHERE id=v_scope AND manage_role='scope' AND active)
   THEN RETURN '[]'::jsonb; END IF;
 v_keywords:=to_regclass(format('silver.%I_keywords',v_scope));
 IF v_keywords IS NULL THEN RETURN '[]'::jsonb; END IF;
 v_owner:=silver.can_manage_scope(v_scope);
 EXECUTE format($query$
   SELECT coalesce(jsonb_agg(jsonb_build_object(
     'scopeId',$1,
     'classUid',c.uid,
     'name',c.name,
     'category',CASE WHEN $2 THEN c.uid::text
       ELSE encode(sha256(convert_to($1||':'||c.uid::text,'UTF8')),'hex') END
   ) ORDER BY c.uid),'[]'::jsonb)
   FROM %s c WHERE c.type='class'
     AND ($2 OR silver.keyword_class_is_shared($1,c.uid::text))
 $query$,v_keywords) INTO v_result USING v_scope,v_owner;
 RETURN coalesce(v_result,'[]'::jsonb);
END
$fn$;
REVOKE ALL ON FUNCTION silver.read_shared_keyword_classes(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION silver.read_shared_keyword_classes(text) TO anon,authenticated;

-- Promote the old Scope-wide share flag once, onto the previously active Class.
-- Only the existing Scope configuration is updated; no Keywords or Galaxy rows.
DO $migration$
DECLARE
 rec record;
 config_relation regclass;
BEGIN
 FOR rec IN SELECT id FROM silver.manage WHERE manage_role='scope' AND active LOOP
   config_relation:=to_regclass(format('silver.%I',rec.id));
   IF config_relation IS NULL THEN CONTINUE; END IF;
   IF NOT EXISTS(SELECT 1 FROM information_schema.columns
     WHERE table_schema='silver' AND table_name=rec.id AND column_name='keyword_meta')
     THEN CONTINUE; END IF;
   EXECUTE format($query$
     UPDATE %s SET keyword_meta=jsonb_set(coalesce(keyword_meta,'{}'::jsonb),
       ARRAY['class_shares',current_keyword_class_uid::text],'true'::jsonb,true)
     WHERE id=$1 AND keyword_class_share_enabled IS TRUE
       AND current_keyword_class_uid IS NOT NULL
       AND NOT (coalesce(keyword_meta,'{}'::jsonb)->'class_shares' ? current_keyword_class_uid)
   $query$,config_relation) USING rec.id;
 END LOOP;
END
$migration$;
