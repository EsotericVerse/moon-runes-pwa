-- Final destructive cutover: run only after the new client and local
-- SQLite reader/writer are validated. Previous classification results are
-- intentionally discarded, not migrated. Original Galaxy articles remain.
-- The active Class should be reanalyzed from article bodies after deployment.
DROP VIEW IF EXISTS api.lo3rwang_keywords_manage;

-- Legacy RPCs cannot run without the old class_id/group_lists storage.
DROP FUNCTION IF EXISTS silver.apply_keyword_classification(text,jsonb);
DROP FUNCTION IF EXISTS api.apply_keyword_classification(jsonb);
DROP FUNCTION IF EXISTS api.apply_keyword_classification(text,jsonb);
DROP FUNCTION IF EXISTS silver.read_keyword_class(text,uuid);
DROP FUNCTION IF EXISTS api.read_keyword_class(text,uuid);

DROP TRIGGER IF EXISTS lo3rwang_keywords_class_uid_sync ON silver.lo3rwang_keywords;
DROP TRIGGER IF EXISTS lrunes_keywords_class_uid_sync ON silver.lrunes_keywords;
DROP FUNCTION IF EXISTS silver.sync_keyword_class_uid();

DROP POLICY IF EXISTS lo3rwang_keywords_authenticated_read ON silver.lo3rwang_keywords;
DROP POLICY IF EXISTS lo3rwang_keywords_shared_current_read ON silver.lo3rwang_keywords;
DROP POLICY IF EXISTS lrunes_keywords_shared_current_read ON silver.lrunes_keywords;
-- Scope ownership remains enforced by existing INSERT/UPDATE/DELETE RLS.
CREATE POLICY lo3rwang_keywords_authenticated_read ON silver.lo3rwang_keywords
  FOR SELECT TO authenticated
  USING(silver.can_manage_scope('lo3rwang') OR EXISTS(
    SELECT 1 FROM silver.lo3rwang cfg
    WHERE cfg.id='lo3rwang' AND cfg.keyword_class_share_enabled IS TRUE
      AND cfg.current_keyword_class_uid=lo3rwang_keywords.class_uid
  ));
CREATE POLICY lo3rwang_keywords_shared_current_read ON silver.lo3rwang_keywords
  FOR SELECT TO anon
  USING(EXISTS(SELECT 1 FROM silver.lo3rwang cfg
    WHERE cfg.id='lo3rwang' AND cfg.keyword_class_share_enabled IS TRUE
      AND cfg.current_keyword_class_uid=lo3rwang_keywords.class_uid));
CREATE POLICY lrunes_keywords_shared_current_read ON silver.lrunes_keywords
  FOR SELECT TO anon,authenticated
  USING(EXISTS(SELECT 1 FROM silver.lrunes cfg
    WHERE cfg.id='lrunes' AND cfg.keyword_class_share_enabled IS TRUE
      AND cfg.current_keyword_class_uid=lrunes_keywords.class_uid));

ALTER TABLE silver.lo3rwang_keywords DROP CONSTRAINT IF EXISTS lo3rwang_keywords_class_fk;
ALTER TABLE silver.lrunes_keywords DROP CONSTRAINT IF EXISTS lrunes_keywords_class_fk;
ALTER TABLE silver.lo3rwang DROP CONSTRAINT IF EXISTS lo3rwang_current_keyword_class_fk;
ALTER TABLE silver.loc DROP CONSTRAINT IF EXISTS loc_current_keyword_class_fk;
ALTER TABLE silver.lo3rwang_keywords DROP CONSTRAINT IF EXISTS lo3rwang_keywords_class_uid_fk;
ALTER TABLE silver.lrunes_keywords DROP CONSTRAINT IF EXISTS lrunes_keywords_class_uid_fk;
ALTER TABLE silver.keyword_classes DROP CONSTRAINT IF EXISTS keyword_classes_class_uid_unique;
ALTER TABLE silver.keyword_classes DROP CONSTRAINT IF EXISTS keyword_classes_pkey;

ALTER TABLE silver.lo3rwang_keywords
  DROP COLUMN IF EXISTS class_id,
  DROP COLUMN IF EXISTS item_no,
  DROP COLUMN IF EXISTS default_group_item_no;
ALTER TABLE silver.lrunes_keywords
  DROP COLUMN IF EXISTS class_id,
  DROP COLUMN IF EXISTS item_no,
  DROP COLUMN IF EXISTS default_group_item_no;
ALTER TABLE silver.lo3rwang DROP COLUMN IF EXISTS current_keyword_class_id;
ALTER TABLE silver.lrunes DROP COLUMN IF EXISTS current_keyword_class_id;
ALTER TABLE silver.loc DROP COLUMN IF EXISTS current_keyword_class_id;
ALTER TABLE silver.keyword_classes DROP COLUMN IF EXISTS class_id;
ALTER TABLE silver.keyword_classes ADD CONSTRAINT keyword_classes_pkey PRIMARY KEY(class_uid);
ALTER TABLE silver.lo3rwang_keywords ADD CONSTRAINT lo3rwang_keywords_class_uid_fk
  FOREIGN KEY(class_uid) REFERENCES silver.keyword_classes(class_uid);
ALTER TABLE silver.lrunes_keywords ADD CONSTRAINT lrunes_keywords_class_uid_fk
  FOREIGN KEY(class_uid) REFERENCES silver.keyword_classes(class_uid);
CREATE INDEX IF NOT EXISTS lo3rwang_keywords_class_uid_order_index
  ON silver.lo3rwang_keywords(class_uid,order_no,keyword_id);
CREATE INDEX IF NOT EXISTS lrunes_keywords_class_uid_order_index
  ON silver.lrunes_keywords(class_uid,order_no,keyword_id);

-- The last references to Galaxy-derived Keywords are removed ONLY after
-- every reading function/view has switched to the new uidlist source.
ALTER TABLE silver.lo3rwang_galaxy
  DROP COLUMN IF EXISTS class_id,
  DROP COLUMN IF EXISTS group_lists;
ALTER TABLE silver.lrunes_galaxy
  DROP COLUMN IF EXISTS class_id,
  DROP COLUMN IF EXISTS group_lists;

CREATE VIEW api.lo3rwang_keywords_manage
WITH (security_invoker=true) AS
SELECT keyword_id,class_uid,group_name,item_name,principle,keywords,
  order_no,class_name,class_group,class_enable
FROM silver.lo3rwang_keywords
WHERE silver.can_manage_scope('lo3rwang');
GRANT SELECT ON api.lo3rwang_keywords_manage TO authenticated;
NOTIFY pgrst,'reload schema';
