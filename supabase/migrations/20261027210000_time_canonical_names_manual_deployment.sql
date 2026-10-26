-- Production Time cutover authorized by the user: old deployed UI may stop
-- working until they choose to deploy the new integrated Time+Space code.
-- Preserve originals as protected archive, promote already migrated v2 data.
-- No deploy, Neon sync or ISR writes.
BEGIN;
SET LOCAL lock_timeout='8s';
SET LOCAL statement_timeout='90s';
LOCK TABLE silver.lo3rwang_time, silver.lrunes_time,
  silver.lo3rwang_time_v2, silver.lrunes_time_v2 IN ACCESS EXCLUSIVE MODE;

DO $$
DECLARE sid text; old_count bigint; backup_count bigint; drift_count bigint;
  missing_count bigint; bad_links bigint;
BEGIN
  IF to_regclass('silver.lo3rwang_time_legacy_20261027') IS NOT NULL
    OR to_regclass('silver.lrunes_time_legacy_20261027') IS NOT NULL THEN
    RAISE EXCEPTION 'Legacy archive names already exist; stop cutover';
  END IF;
  FOREACH sid IN ARRAY ARRAY['lo3rwang','lrunes'] LOOP
    EXECUTE format('SELECT count(*) FROM silver.%I',sid||'_time') INTO old_count;
    SELECT count(*) INTO backup_count FROM silver.time_v2_cutover_backup
      WHERE scope_id=sid;
    EXECUTE format($sql$
      SELECT count(*) FROM silver.%I t
      LEFT JOIN silver.time_v2_cutover_backup b
        ON b.scope_id=%L AND b.old_record_id=t.record_id
      WHERE b.old_record_id IS NULL
         OR to_jsonb(t) IS DISTINCT FROM b.original_row
    $sql$,sid||'_time',sid) INTO drift_count;
    IF old_count<>backup_count OR drift_count<>0 THEN
      RAISE EXCEPTION 'Legacy Time changed since v2 cutover: % old %, backup %, drift %',
        sid,old_count,backup_count,drift_count;
    END IF;
    EXECUTE format($sql$
      SELECT count(*) FROM silver.%I t WHERE
        length(t.uid)<>4
        OR t.type NOT IN ('anchor','time_period','time_trace')
        OR (t.type='anchor' AND t.address IS NULL)
        OR (t.type<>'anchor' AND t.address IS NOT NULL)
        OR (t.type='time_period'
            AND (cardinality(t.anchor_ids) NOT BETWEEN 1 AND 2
              OR EXISTS(SELECT 1 FROM unnest(t.anchor_ids) ref
                  WHERE NOT EXISTS(SELECT 1 FROM silver.%I a
                                   WHERE a.uid=ref AND a.type='anchor'))))
        OR (t.type='time_trace'
            AND (cardinality(t.anchor_ids)<1 OR
              EXISTS(SELECT 1 FROM unnest(t.anchor_ids) ref
                WHERE NOT EXISTS(SELECT 1 FROM silver.%I e
                                 WHERE e.uid=ref AND e.type='time_period'))))
    $sql$,sid||'_time_v2',sid||'_time_v2',sid||'_time_v2')
      INTO bad_links;
    IF bad_links<>0 THEN
      RAISE EXCEPTION 'Invalid canonical Time rows for %: %',sid,bad_links;
    END IF;
  END LOOP;
END $$;

-- These are table renames, not copied or deleted data.
ALTER TABLE silver.lo3rwang_time RENAME TO lo3rwang_time_legacy_20261027;
ALTER TABLE silver.lrunes_time RENAME TO lrunes_time_legacy_20261027;
ALTER TABLE silver.lo3rwang_time_v2 RENAME TO lo3rwang_time;
ALTER TABLE silver.lrunes_time_v2 RENAME TO lrunes_time;

-- Archived originals are not part of the public API. Keep rows and policies,
-- revoke the external table privileges rather than dropping any old record.
REVOKE ALL ON silver.lo3rwang_time_legacy_20261027 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON silver.lrunes_time_legacy_20261027 FROM PUBLIC,anon,authenticated;
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anonymous') THEN
    EXECUTE 'REVOKE ALL ON silver.lo3rwang_time_legacy_20261027 FROM anonymous';
    EXECUTE 'REVOKE ALL ON silver.lrunes_time_legacy_20261027 FROM anonymous';
  END IF;
END $$;

-- Frontend will be deployed manually by the user; refresh PostgREST schema
-- so future requests resolve the promoted tables by original names.
NOTIFY pgrst,'reload schema';
COMMIT;
