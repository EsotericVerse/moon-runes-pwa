-- Stage 1 of eliminating class_id and item_no: introduce persistent identities
-- without dropping columns still read by the production app or its RPCs.
-- Class UID is newly allocated Base62(4), not derived from UUID or keyword_sha.
CREATE OR REPLACE FUNCTION silver.new_keyword_class_uid()
RETURNS text LANGUAGE plpgsql VOLATILE
SET search_path TO 'pg_catalog'
AS $$
DECLARE
  alphabet CONSTANT text := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  candidate text;
  tries integer;
BEGIN
  FOR tries IN 1..128 LOOP
    SELECT string_agg(substr(alphabet, 1+floor(random()*62)::integer, 1), '' ORDER BY position)
      INTO candidate
      FROM generate_series(1,4) AS n(position);
    IF NOT EXISTS(SELECT 1 FROM silver.keyword_classes WHERE class_uid=candidate) THEN
      RETURN candidate;
    END IF;
  END LOOP;
  RAISE EXCEPTION 'Unable to allocate a unique four-character Keywords Class UID';
END;
$$;

ALTER TABLE silver.keyword_classes ADD COLUMN IF NOT EXISTS class_uid varchar(4);
ALTER TABLE silver.keyword_classes
  ALTER COLUMN class_uid SET DEFAULT silver.new_keyword_class_uid();
UPDATE silver.keyword_classes SET class_uid=silver.new_keyword_class_uid()
  WHERE class_uid IS NULL;
ALTER TABLE silver.keyword_classes ALTER COLUMN class_uid SET NOT NULL;
ALTER TABLE silver.keyword_classes
  ADD CONSTRAINT keyword_classes_class_uid_unique UNIQUE (class_uid);
ALTER TABLE silver.keyword_classes
  ADD CONSTRAINT keyword_classes_class_uid_format
  CHECK (class_uid ~ '^[0-9A-Za-z]{4}$');

ALTER TABLE silver.keyword_classes ADD COLUMN IF NOT EXISTS default_keyword_id bigint;
UPDATE silver.keyword_classes c SET default_keyword_id=k.keyword_id
  FROM silver.lo3rwang_keywords k
  WHERE k.class_id=c.class_id AND k.item_no=k.default_group_item_no;
UPDATE silver.keyword_classes c SET default_keyword_id=k.keyword_id
  FROM silver.lrunes_keywords k
  WHERE k.class_id=c.class_id AND k.item_no=k.default_group_item_no
    AND c.default_keyword_id IS NULL;

-- Transitional helper: old writer supplies UUID; new writer will supply class_uid.
-- Trigger must be removed together with the legacy class_id column at cutover.
CREATE OR REPLACE FUNCTION silver.sync_keyword_class_uid()
RETURNS trigger LANGUAGE plpgsql VOLATILE
SET search_path TO 'pg_catalog'
AS $$
BEGIN
  IF NEW.class_uid IS NULL OR (TG_OP='UPDATE' AND NEW.class_id IS DISTINCT FROM OLD.class_id) THEN
    SELECT c.class_uid INTO NEW.class_uid
      FROM silver.keyword_classes c WHERE c.class_id=NEW.class_id;
  END IF;
  IF NEW.class_uid IS NULL THEN
    RAISE EXCEPTION 'Cannot resolve Keywords Class UID';
  END IF;
  RETURN NEW;
END;
$$;

ALTER TABLE silver.lo3rwang_keywords ADD COLUMN IF NOT EXISTS class_uid varchar(4);
ALTER TABLE silver.lrunes_keywords ADD COLUMN IF NOT EXISTS class_uid varchar(4);
ALTER TABLE silver.lo3rwang_keywords
  ADD COLUMN IF NOT EXISTS uidlist jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE silver.lrunes_keywords
  ADD COLUMN IF NOT EXISTS uidlist jsonb NOT NULL DEFAULT '[]'::jsonb;
UPDATE silver.lo3rwang_keywords k SET class_uid=c.class_uid
  FROM silver.keyword_classes c WHERE k.class_id=c.class_id AND k.class_uid IS DISTINCT FROM c.class_uid;
UPDATE silver.lrunes_keywords k SET class_uid=c.class_uid
  FROM silver.keyword_classes c WHERE k.class_id=c.class_id AND k.class_uid IS DISTINCT FROM c.class_uid;

CREATE TRIGGER lo3rwang_keywords_class_uid_sync
  BEFORE INSERT OR UPDATE OF class_id,class_uid ON silver.lo3rwang_keywords
  FOR EACH ROW EXECUTE FUNCTION silver.sync_keyword_class_uid();
CREATE TRIGGER lrunes_keywords_class_uid_sync
  BEFORE INSERT OR UPDATE OF class_id,class_uid ON silver.lrunes_keywords
  FOR EACH ROW EXECUTE FUNCTION silver.sync_keyword_class_uid();

ALTER TABLE silver.lo3rwang_keywords ALTER COLUMN class_uid SET NOT NULL;
ALTER TABLE silver.lrunes_keywords ALTER COLUMN class_uid SET NOT NULL;
ALTER TABLE silver.lo3rwang_keywords ADD CONSTRAINT lo3rwang_keywords_class_uid_fk
  FOREIGN KEY (class_uid) REFERENCES silver.keyword_classes(class_uid);
ALTER TABLE silver.lrunes_keywords ADD CONSTRAINT lrunes_keywords_class_uid_fk
  FOREIGN KEY (class_uid) REFERENCES silver.keyword_classes(class_uid);
ALTER TABLE silver.lo3rwang_keywords ADD CONSTRAINT lo3rwang_keywords_uidlist_array
  CHECK (jsonb_typeof(uidlist)='array');
ALTER TABLE silver.lrunes_keywords ADD CONSTRAINT lrunes_keywords_uidlist_array
  CHECK (jsonb_typeof(uidlist)='array');

-- New config references for the future atomic reader/writer switch.
ALTER TABLE silver.lo3rwang ADD COLUMN IF NOT EXISTS current_keyword_class_uid varchar(4);
ALTER TABLE silver.lrunes ADD COLUMN IF NOT EXISTS current_keyword_class_uid varchar(4);
UPDATE silver.lo3rwang s SET current_keyword_class_uid=c.class_uid
  FROM silver.keyword_classes c WHERE s.current_keyword_class_id=c.class_id;
UPDATE silver.lrunes s SET current_keyword_class_uid=c.class_uid
  FROM silver.keyword_classes c WHERE s.current_keyword_class_id=c.class_id;
