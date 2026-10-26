BEGIN;
CREATE OR REPLACE FUNCTION silver.validate_scoped_trace_map() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'pg_catalog','silver' AS $fn$
DECLARE members text[]; available integer; sql text;
BEGIN
 IF NEW.trace_type='space_anchor' THEN RETURN NEW; END IF;
 IF NEW.trace_type='space_period' THEN
   members:=NEW.anchor_list;
   IF EXISTS (SELECT 1 FROM unnest(members) AS u(id) WHERE id IS NULL OR id !~ '^[A-Za-z0-9]{4}$')
       OR (SELECT count(DISTINCT id) FROM unnest(members) AS u(id))<>cardinality(members)
   THEN RAISE EXCEPTION '路線包含空白、重複或不合法定錨點'; END IF;
 ELSIF NEW.trace_type='space_trace' THEN
   IF EXISTS (SELECT 1 FROM jsonb_array_elements(NEW.segment_list) AS e(pair)
      WHERE NOT CASE WHEN jsonb_typeof(e.pair)='array' THEN
        jsonb_array_length(e.pair)=2
        AND jsonb_typeof(e.pair->0)='string' AND jsonb_typeof(e.pair->1)='string'
        AND (e.pair->>0) ~ '^[A-Za-z0-9]{4}$'
        AND (e.pair->>1) ~ '^[A-Za-z0-9]{4}$'
        AND (e.pair->>0) <> (e.pair->>1)
      ELSE false END)
   THEN RAISE EXCEPTION '痕跡圖每段必須是兩個不同、有效的地點 UID'; END IF;
   SELECT array_agg(DISTINCT uid) INTO members FROM (
     SELECT e.pair->>0 AS uid FROM jsonb_array_elements(NEW.segment_list) AS e(pair)
     UNION ALL SELECT e.pair->>1 FROM jsonb_array_elements(NEW.segment_list) AS e(pair)
   ) used;
 ELSE RAISE EXCEPTION '未知空間資料類型'; END IF;
 sql:=format('SELECT count(*) FROM %I.%I WHERE trace_type=''space_anchor'' AND uid=ANY($1)%s',
    TG_TABLE_SCHEMA,TG_TABLE_NAME,
    CASE WHEN TG_TABLE_NAME='loc_trace' THEN ' AND scope_id=$2' ELSE '' END);
 IF TG_TABLE_NAME='loc_trace' THEN
   EXECUTE sql INTO available USING members,NEW.scope_id;
 ELSE EXECUTE sql INTO available USING members; END IF;
 IF available<>coalesce(cardinality(members),0)
 THEN RAISE EXCEPTION '關聯引用不同 Scope 或不存在的地點'; END IF;
 RETURN NEW;
END $fn$;

CREATE OR REPLACE FUNCTION silver.protect_scoped_trace_anchor() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'pg_catalog','silver' AS $fn$
DECLARE linked boolean; sql text;
BEGIN
 IF OLD.trace_type<>'space_anchor' THEN RETURN OLD; END IF;
 sql:=format($s$
   SELECT EXISTS (SELECT 1 FROM %I.%I m WHERE (
     (m.trace_type='space_period' AND $1=ANY(m.anchor_list))
     OR (m.trace_type='space_trace' AND EXISTS (
       SELECT 1 FROM jsonb_array_elements(m.segment_list) AS e(pair)
       WHERE e.pair->>0=$1 OR e.pair->>1=$1
     ))
   )%s)$s$,TG_TABLE_SCHEMA,TG_TABLE_NAME,
     CASE WHEN TG_TABLE_NAME='loc_trace' THEN ' AND m.scope_id=$2' ELSE '' END);
 IF TG_TABLE_NAME='loc_trace' THEN EXECUTE sql INTO linked USING OLD.uid,OLD.scope_id;
 ELSE EXECUTE sql INTO linked USING OLD.uid; END IF;
 IF linked THEN RAISE EXCEPTION '地點仍被路線圖或痕跡圖引用，請先解除關聯'; END IF;
 RETURN OLD;
END $fn$;
COMMIT;