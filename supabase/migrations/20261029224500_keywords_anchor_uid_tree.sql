-- Keywords tree (Anchor pattern): exactly six columns per node.
-- The old Keyword tables are retained under *_legacy for transactional recovery,
-- never exposed to Data API users. Galaxy articles/classifications are not modified.
CREATE OR REPLACE FUNCTION silver.new_keyword_tree_uid(p_scope text)
RETURNS varchar(4) LANGUAGE plpgsql VOLATILE SET search_path TO ''
AS $fn$
DECLARE
  alphabet constant text:='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  candidate varchar(4);found boolean;
BEGIN
  IF p_scope !~ '^[a-z][a-z0-9]{0,14}$' THEN RAISE EXCEPTION 'Invalid Scope'; END IF;
  FOR tries IN 1..120 LOOP
    SELECT string_agg(substr(alphabet,1+floor(random()*62)::integer,1),'' ORDER BY position)::varchar(4)
      INTO candidate FROM generate_series(1,4) n(position);
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM silver.%I_keywords_v2 WHERE uid=$1)',p_scope)
      INTO found USING candidate;
    IF NOT found AND NOT EXISTS(SELECT 1 FROM silver.keyword_classes WHERE class_uid=candidate)
      THEN RETURN candidate; END IF;
  END LOOP;
  RAISE EXCEPTION 'Cannot allocate a unique Keyword UID';
END
$fn$;
REVOKE ALL ON FUNCTION silver.new_keyword_tree_uid(text) FROM PUBLIC;

DO $migration$
DECLARE
  scope_name text;
  class_row record;group_row record;item_row record;
  category text;cat_uid varchar(4);group_uid varchar(4);item_uid varchar(4);
  default_group text;class_exists boolean;
BEGIN
  FOR scope_name IN SELECT unnest(ARRAY['lo3rwang','lrunes']) LOOP
    EXECUTE format($ddl$
      CREATE TABLE IF NOT EXISTS silver.%I_keywords_v2 (
        uid varchar(4) PRIMARY KEY NOT NULL,
        type text NOT NULL CHECK (type IN ('category','class','group','item')),
        name text NOT NULL CHECK (length(btrim(name))>0),
        "desc" text NOT NULL DEFAULT '',
        lists jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(lists)='array'),
        uid_lists jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(uid_lists)='array'),
        CONSTRAINT keyword_node_uid_format CHECK (uid ~ '^[0-9A-Za-z]{4}$')
      )
    $ddl$,scope_name);
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM silver.%I_keywords_v2)',scope_name)
      INTO class_exists;
    IF class_exists THEN RAISE EXCEPTION 'Keywords V2 stage already has data for %',scope_name; END IF;
    FOR class_row IN EXECUTE format(
      'SELECT class_uid,class_name FROM silver.%I_keywords GROUP BY class_uid,class_name ORDER BY class_name',
      scope_name)
    LOOP
      category:=CASE
        WHEN class_row.class_name LIKE '%符文%' THEN '符文'
        WHEN class_row.class_name IN ('Pop','Hip-Hop','Electronic','Rock','Vocal') THEN '音樂'
        WHEN class_row.class_name LIKE '%文化%' THEN '文化'
        ELSE '其他' END;
      EXECUTE format('SELECT uid FROM silver.%I_keywords_v2 WHERE type=$1 AND name=$2',
        scope_name) INTO cat_uid USING 'category',category;
      IF cat_uid IS NULL THEN
        cat_uid:=silver.new_keyword_tree_uid(scope_name);
        EXECUTE format(
          'INSERT INTO silver.%I_keywords_v2(uid,type,name,"desc") VALUES($1,$2,$3,$4)',
          scope_name) USING cat_uid,'category',category,category||'分類';
      END IF;
      EXECUTE format(
        'INSERT INTO silver.%I_keywords_v2(uid,type,name,"desc") VALUES($1,$2,$3,$4)',
        scope_name) USING class_row.class_uid,'class',class_row.class_name,
          CASE WHEN class_row.class_name='符文66' THEN '66符文' ELSE class_row.class_name END;
      EXECUTE format(
        'UPDATE silver.%I_keywords_v2 SET lists=lists||jsonb_build_array($1) WHERE uid=$2',
        scope_name) USING class_row.class_uid,cat_uid;
      EXECUTE format(
        'SELECT class_group FROM silver.%I_keywords WHERE class_uid=$1 AND item_no=default_group_item_no LIMIT 1',
        scope_name) INTO default_group USING class_row.class_uid;
      FOR group_row IN EXECUTE format($query$
        SELECT class_group,min(order_no) first_order
        FROM silver.%I_keywords WHERE class_uid=$1 GROUP BY class_group
        ORDER BY CASE WHEN class_group=$2 THEN 1 ELSE 0 END,min(order_no),class_group
      $query$,scope_name) USING class_row.class_uid,default_group
      LOOP
        group_uid:=silver.new_keyword_tree_uid(scope_name);
        EXECUTE format(
          'INSERT INTO silver.%I_keywords_v2(uid,type,name,"desc") VALUES($1,$2,$3,$4)',
          scope_name) USING group_uid,'group',group_row.class_group,group_row.class_group||'組';
        EXECUTE format(
          'UPDATE silver.%I_keywords_v2 SET lists=lists||jsonb_build_array($1) WHERE uid=$2',
          scope_name) USING group_uid,class_row.class_uid;
        FOR item_row IN EXECUTE format($query$
          SELECT item_name,principle,keywords FROM silver.%I_keywords
          WHERE class_uid=$1 AND class_group=$2 ORDER BY order_no,keyword_id
        $query$,scope_name) USING class_row.class_uid,group_row.class_group
        LOOP
          item_uid:=silver.new_keyword_tree_uid(scope_name);
          EXECUTE format(
            'INSERT INTO silver.%I_keywords_v2(uid,type,name,"desc",lists) VALUES($1,$2,$3,$4,$5)',
            scope_name) USING item_uid,'item',item_row.item_name,item_row.principle,item_row.keywords;
          EXECUTE format(
            'UPDATE silver.%I_keywords_v2 SET lists=lists||jsonb_build_array($1) WHERE uid=$2',
            scope_name) USING item_uid,group_uid;
        END LOOP;
      END LOOP;
    END LOOP;
    EXECUTE format('ALTER TABLE silver.%I_keywords_v2 ENABLE ROW LEVEL SECURITY',scope_name);
    EXECUTE format($ddl$
      CREATE POLICY keywords_tree_owner_read ON silver.%I_keywords_v2
      FOR SELECT TO authenticated USING (silver.can_manage_scope(%L))
    $ddl$,scope_name,scope_name);
    EXECUTE format($ddl$
      CREATE POLICY keywords_tree_owner_insert ON silver.%I_keywords_v2
      FOR INSERT TO authenticated WITH CHECK (silver.can_manage_scope(%L))
    $ddl$,scope_name,scope_name);
    EXECUTE format($ddl$
      CREATE POLICY keywords_tree_owner_update ON silver.%I_keywords_v2
      FOR UPDATE TO authenticated USING (silver.can_manage_scope(%L))
      WITH CHECK (silver.can_manage_scope(%L))
    $ddl$,scope_name,scope_name,scope_name);
    EXECUTE format($ddl$
      CREATE POLICY keywords_tree_owner_delete ON silver.%I_keywords_v2
      FOR DELETE TO authenticated USING (silver.can_manage_scope(%L))
    $ddl$,scope_name,scope_name);
    EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON silver.%I_keywords_v2 TO authenticated',
      scope_name);
  END LOOP;
END
$migration$;

-- In one transaction, swap logical table identities.
DROP VIEW IF EXISTS api.lo3rwang_keywords_manage;
ALTER TABLE silver.lo3rwang_keywords RENAME TO lo3rwang_keywords_legacy;
ALTER TABLE silver.lrunes_keywords RENAME TO lrunes_keywords_legacy;
ALTER TABLE silver.lo3rwang_keywords_v2 RENAME TO lo3rwang_keywords;
ALTER TABLE silver.lrunes_keywords_v2 RENAME TO lrunes_keywords;
REVOKE ALL ON silver.lo3rwang_keywords_legacy,silver.lrunes_keywords_legacy FROM anon,authenticated;
CREATE VIEW api.lo3rwang_keywords_manage
WITH (security_invoker=true)
AS SELECT uid,type,name,"desc",lists,uid_lists
FROM silver.lo3rwang_keywords WHERE silver.can_manage_scope('lo3rwang');
GRANT SELECT ON api.lo3rwang_keywords_manage TO authenticated;

-- Keep the active Class's 4-char UID only. Old UUID class_id is not used.
ALTER TABLE silver.lo3rwang DROP COLUMN IF EXISTS current_keyword_class_id;
ALTER TABLE silver.lrunes DROP COLUMN IF EXISTS current_keyword_class_id;
ALTER TABLE silver.loc DROP COLUMN IF EXISTS current_keyword_class_id;
NOTIFY pgrst,'reload schema';
