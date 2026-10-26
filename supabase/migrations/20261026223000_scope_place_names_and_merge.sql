-- Run AFTER 20261026190000_single_trace_uid_cutover.sql.
-- Canonical identity: one Scope-local trace.uid; Galaxy.source_place is immutable.
-- Manual name decisions persist for subsequent Facebook import reconciliation.

DO $$
DECLARE scope_name text; target text;
BEGIN
 FOR scope_name IN SELECT unnest(ARRAY['lo3rwang','lrunes','loc']) LOOP
   target:=scope_name||'_place';
   EXECUTE format('CREATE TABLE IF NOT EXISTS silver.%I (
     uid varchar(4) PRIMARY KEY,
     name_lists text[] NOT NULL DEFAULT ''{}''::text[],
     created_at timestamptz NOT NULL DEFAULT now(),
     updated_at timestamptz NOT NULL DEFAULT now(),
     CONSTRAINT %I CHECK (uid ~ ''^[0-9A-F]{4}$'')
   )',target,target||'_uid_check');
   EXECUTE format('ALTER TABLE silver.%I ENABLE ROW LEVEL SECURITY',target);
   EXECUTE format('REVOKE ALL ON TABLE silver.%I FROM PUBLIC, anon, authenticated',target);
   EXECUTE format('GRANT SELECT ON TABLE silver.%I TO anon, authenticated',target);
   EXECUTE format('DROP POLICY IF EXISTS %I ON silver.%I',target||'_public_read',target);
   EXECUTE format('CREATE POLICY %I ON silver.%I FOR SELECT TO anon, authenticated USING(true)',
      target||'_public_read',target);
 END LOOP;
END $$;

CREATE TABLE IF NOT EXISTS silver.trace_place_merge_archive (
 scope_id text NOT NULL,
 old_uid varchar(4) NOT NULL,
 canonical_uid varchar(4) NOT NULL,
 original_record jsonb NOT NULL,
 merged_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(scope_id,old_uid)
);
ALTER TABLE silver.trace_place_merge_archive ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE silver.trace_place_merge_archive FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION silver.search_scope_trace_place_names(
 p_scope_id text,p_term text,p_limit integer DEFAULT 8)
RETURNS TABLE(uid varchar(4),title text,floor_label text,longitude double precision,latitude double precision)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,silver
AS $$
DECLARE pattern text; sql text;
BEGIN
 IF p_scope_id NOT IN ('lo3rwang','lrunes','loc') THEN RETURN; END IF;
 IF nullif(btrim(p_term),'') IS NULL THEN RETURN; END IF;
 pattern:='%'||replace(replace(replace(left(btrim(p_term),100),'\','\\'),'%','\%'),'_','\_')||'%';
 sql:=format('SELECT a.uid::varchar(4),a.title::text,a.floor_label::text,a.longitude,a.latitude
 FROM silver.%I a LEFT JOIN silver.%I n ON n.uid=a.uid
 WHERE a.trace_type=''anchor'' %s AND
  (a.title ILIKE $1 OR EXISTS
    (SELECT 1 FROM unnest(COALESCE(n.name_lists,''{}''::text[])) item
      WHERE item ILIKE $1))
 ORDER BY a.created_at,a.uid LIMIT $2',
 p_scope_id||'_trace',p_scope_id||'_place',
 CASE WHEN p_scope_id='loc' THEN 'AND a.scope_id=''loc''' ELSE '' END);
 RETURN QUERY EXECUTE sql USING pattern,least(greatest(coalesce(p_limit,8),1),8);
END $$;
REVOKE ALL ON FUNCTION silver.search_scope_trace_place_names(text,text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION silver.search_scope_trace_place_names(text,text,integer) TO anon,authenticated;

-- Add explicitly confirmed aliases without needing to delete an anchor.
-- Name arrays intentionally have no unique-name constraint: same wording can
-- legitimately identify different floors or historical entities.
CREATE OR REPLACE FUNCTION silver.save_scope_trace_place_names(
 p_scope_id text,p_uid varchar(4),p_names text[])
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,silver
AS $$
DECLARE exists_anchor boolean; saved_count integer;
BEGIN
 IF p_scope_id NOT IN ('lo3rwang','lrunes','loc') OR NOT silver.can_manage_scope(p_scope_id)
 THEN RAISE EXCEPTION 'No permission to manage Scope place names'; END IF;
 EXECUTE format('SELECT EXISTS(SELECT 1 FROM silver.%I WHERE uid=$1 AND trace_type=''anchor'' %s)',
  p_scope_id||'_trace',CASE WHEN p_scope_id='loc' THEN 'AND scope_id=''loc''' ELSE '' END)
  INTO exists_anchor USING p_uid;
 IF NOT exists_anchor THEN RAISE EXCEPTION 'Selected anchor UID does not exist in this Scope'; END IF;
 IF cardinality(p_names)>250 THEN RAISE EXCEPTION 'Too many place name aliases'; END IF;
 EXECUTE format('INSERT INTO silver.%I(uid,name_lists) VALUES ($1,$2)
 ON CONFLICT(uid) DO UPDATE SET name_lists=(
  SELECT ARRAY(SELECT DISTINCT name FROM unnest(
   silver.%I.name_lists || excluded.name_lists) name
   WHERE nullif(btrim(name),'''') IS NOT NULL ORDER BY name)
 ),updated_at=now()',p_scope_id||'_place',p_scope_id||'_place')
 USING p_uid,ARRAY(SELECT DISTINCT btrim(n) FROM unnest(p_names) n
  WHERE nullif(btrim(n),'') IS NOT NULL AND char_length(n)<=200 ORDER BY btrim(n));
 GET DIAGNOSTICS saved_count=ROW_COUNT;
 RETURN saved_count;
END $$;
REVOKE ALL ON FUNCTION silver.save_scope_trace_place_names(text,varchar,text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION silver.save_scope_trace_place_names(text,varchar,text[]) TO authenticated;

-- Explicit batch confirmation of SAME place. Preserve first-created UID/name,
-- all original rows in the protected archive and original Queue sequence.
CREATE OR REPLACE FUNCTION silver.merge_scope_trace_place_names(
 p_scope_id text,p_keep_uid varchar(4),p_remove_uids varchar(4)[])
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,silver
AS $$
DECLARE source_table text; place_table text; galaxy_table text;
 keep_title text; keep_created timestamptz; keep_floor text; keep_level smallint;
 removed_count integer; expected integer; all_names text[];
BEGIN
 IF p_scope_id NOT IN ('lo3rwang','lrunes','loc') OR NOT silver.can_manage_scope(p_scope_id)
 THEN RAISE EXCEPTION 'No permission to merge places'; END IF;
 IF p_remove_uids IS NULL OR cardinality(p_remove_uids)<1
 THEN RAISE EXCEPTION 'No place UIDs were selected'; END IF;
 IF cardinality(p_remove_uids)>100 THEN RAISE EXCEPTION 'Use at most 100 selected places per batch'; END IF;
 IF p_keep_uid=ANY(p_remove_uids) OR cardinality(p_remove_uids)
  <> (SELECT count(DISTINCT item) FROM unnest(p_remove_uids) item)
 THEN RAISE EXCEPTION 'Duplicate or circular merge UID'; END IF;
 source_table:=p_scope_id||'_trace';place_table:=p_scope_id||'_place';
 galaxy_table:=p_scope_id||'_galaxy';
 EXECUTE format('SELECT title,created_at,floor_label,floor_level FROM silver.%I
 WHERE uid=$1 AND trace_type=''anchor'' %s FOR UPDATE',
 source_table,CASE WHEN p_scope_id='loc' THEN 'AND scope_id=''loc''' ELSE '' END)
 INTO keep_title,keep_created,keep_floor,keep_level USING p_keep_uid;
 IF keep_title IS NULL THEN RAISE EXCEPTION 'Canonical place not found'; END IF;
 -- Serialize all participating anchor identities before writing.
 EXECUTE format('SELECT count(*) FROM silver.%I
 WHERE uid=ANY($1) AND trace_type=''anchor'' %s',
 source_table,CASE WHEN p_scope_id='loc' THEN 'AND scope_id=''loc''' ELSE '' END)
 INTO removed_count USING p_remove_uids;
 IF removed_count<>cardinality(p_remove_uids)
 THEN RAISE EXCEPTION 'Selected UIDs do not all belong to this Scope'; END IF;
 -- The caller confirms identity; floor conflicts are retained as separate places.
 EXECUTE format('SELECT count(*) FROM silver.%I WHERE uid=ANY($1)
 AND ((nullif(floor_label,'''') IS NOT NULL AND nullif($2,'''') IS NOT NULL
    AND lower(floor_label)<>lower($2))
 OR (floor_level IS NOT NULL AND $3 IS NOT NULL AND floor_level<>$3))',
 source_table) INTO expected USING p_remove_uids,keep_floor,keep_level;
 IF expected>0 THEN RAISE EXCEPTION 'Different floors must remain separate place identities'; END IF;
 EXECUTE format('SELECT count(*) FROM silver.%I WHERE uid=ANY($1)
 AND (created_at < $2 OR (created_at=$2 AND uid<$3))',
 source_table) INTO expected USING p_remove_uids,keep_created,p_keep_uid;
 IF expected>0 THEN RAISE EXCEPTION 'Keep the first saved place as the canonical UID'; END IF;
 EXECUTE format('SELECT ARRAY(SELECT DISTINCT name FROM (
 SELECT title::text name FROM silver.%I WHERE uid=$1 OR uid=ANY($2)
 UNION ALL SELECT unnest(name_lists) FROM silver.%I WHERE uid=$1 OR uid=ANY($2)
 ) source WHERE nullif(btrim(name),'''') IS NOT NULL ORDER BY name)',
 source_table,place_table) INTO all_names USING p_keep_uid,p_remove_uids;
 EXECUTE format('INSERT INTO silver.trace_place_merge_archive(scope_id,old_uid,canonical_uid,original_record)
 SELECT $1,uid,$2,to_jsonb(row) FROM silver.%I row
 WHERE uid=ANY($3) AND trace_type=''anchor''
 ON CONFLICT(scope_id,old_uid) DO NOTHING',source_table)
 USING p_scope_id,p_keep_uid,p_remove_uids;
 -- Keep time evidence from every merged identity; don't invent timestamps.
 EXECUTE format('UPDATE silver.%I target SET times=(
 SELECT COALESCE(array_agg(DISTINCT stamp ORDER BY stamp),''{}''::timestamptz[])
 FROM (
  SELECT unnest(COALESCE(target.times,''{}''::timestamptz[])) stamp
  UNION ALL
  SELECT unnest(COALESCE(src.times,''{}''::timestamptz[])) stamp
   FROM silver.%I src WHERE src.uid=ANY($2) AND src.trace_type=''anchor''
 ) selected) WHERE target.uid=$1 AND target.trace_type=''anchor''',
 source_table,source_table) USING p_keep_uid,p_remove_uids;
 -- Replace queued identities without reordering stops or duplicating the same UID.
 EXECUTE format('UPDATE silver.%I route SET anchor_uids=(
 SELECT COALESCE(array_agg(entry.uid ORDER BY entry.first_position),''{}''::text[])
 FROM (SELECT CASE WHEN stop.uid=ANY($2) THEN $1 ELSE stop.uid END uid,
       min(stop.ordinality) first_position
       FROM unnest(route.anchor_uids) WITH ORDINALITY stop(uid,ordinality)
       GROUP BY 1) entry)
 WHERE route.trace_type=''map'' AND route.anchor_uids && $2::text[] %s',
 source_table,CASE WHEN p_scope_id='loc' THEN 'AND route.scope_id=''loc''' ELSE '' END)
 USING p_keep_uid,p_remove_uids;
 IF p_scope_id<>'loc' THEN
  EXECUTE format('UPDATE silver.%I SET place_id=$1
  WHERE place_id=ANY($2)',galaxy_table) USING p_keep_uid,p_remove_uids;
 END IF;
 UPDATE silver.trace_place_alias SET anchor_uid=p_keep_uid
 WHERE scope_id=p_scope_id AND anchor_uid=ANY(p_remove_uids);
 EXECUTE format('INSERT INTO silver.%I(uid,name_lists)
 VALUES($1,$2) ON CONFLICT(uid) DO UPDATE SET
 name_lists=excluded.name_lists,updated_at=now()',place_table)
 USING p_keep_uid,all_names;
 EXECUTE format('DELETE FROM silver.%I WHERE uid=ANY($1)
 AND trace_type=''anchor'' %s',
 source_table,CASE WHEN p_scope_id='loc' THEN 'AND scope_id=''loc''' ELSE '' END)
 USING p_remove_uids;
 GET DIAGNOSTICS removed_count=ROW_COUNT;
 IF removed_count<>cardinality(p_remove_uids) THEN
  RAISE EXCEPTION 'Inconsistent merge: % of % were removed',removed_count,cardinality(p_remove_uids);
 END IF;
 EXECUTE format('DELETE FROM silver.%I WHERE uid=ANY($1)',place_table)
 USING p_remove_uids;
 RETURN removed_count;
END $$;
REVOKE ALL ON FUNCTION silver.merge_scope_trace_place_names(text,varchar,varchar[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION silver.merge_scope_trace_place_names(text,varchar,varchar[]) TO authenticated;
