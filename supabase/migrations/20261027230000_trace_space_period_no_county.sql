-- New canonical route type: space_period. Existing UID, anchor_list and times are preserved.
-- Scoped operation, does not alter address or invoke geocoding.
DO $rename$
DECLARE obj text; ddl text; c_before bigint; c_after bigint;
BEGIN
  IF to_regclass('silver.lo3rwang_trace') IS NULL OR to_regclass('silver.lrunes_trace') IS NULL
  THEN RAISE EXCEPTION 'Scoped Trace tables are missing'; END IF;
  SELECT count(*) INTO c_before FROM silver.lo3rwang_trace WHERE trace_type='space_road';
  IF c_before>1 THEN RAISE EXCEPTION 'Unexpected number of original routes'; END IF;
  FOREACH obj IN ARRAY ARRAY['lo3rwang','lrunes'] LOOP
    EXECUTE format('ALTER TABLE silver.%I DROP CONSTRAINT %I',obj||'_trace',obj||'_trace_record_shape');
    EXECUTE format('ALTER TABLE silver.%I DROP CONSTRAINT %I',obj||'_trace',obj||'_trace_trace_type_check');
    EXECUTE format('ALTER TABLE silver.%I DISABLE TRIGGER %I',obj||'_trace',obj||'_trace_identity_guard');
    EXECUTE format('UPDATE silver.%I SET trace_type=''space_period'' WHERE trace_type=''space_road''',obj||'_trace');
    EXECUTE format('ALTER TABLE silver.%I ENABLE TRIGGER %I',obj||'_trace',obj||'_trace_identity_guard');
  END LOOP;
  FOR obj IN SELECT unnest(ARRAY['validate_scoped_trace_map','protect_scoped_trace_anchor']) LOOP
    SELECT pg_get_functiondef(p.oid) INTO ddl FROM pg_proc p
      JOIN pg_namespace ns ON ns.oid=p.pronamespace
      WHERE ns.nspname='silver' AND p.proname=obj;
    IF ddl IS NULL OR position('space_road' IN ddl)=0
    THEN RAISE EXCEPTION 'Unexpected missing old Trace function: %',obj; END IF;
    EXECUTE replace(ddl,'space_road','space_period');
  END LOOP;
  FOREACH obj IN ARRAY ARRAY['lo3rwang','lrunes'] LOOP
    EXECUTE format('ALTER TABLE silver.%I ADD CONSTRAINT %I CHECK (trace_type IN (''space_anchor'',''space_period'',''space_trace''))',obj||'_trace',obj||'_trace_trace_type_check');
    EXECUTE format($SQL$ALTER TABLE silver.%I ADD CONSTRAINT %I CHECK(
      (trace_type='space_anchor' AND cardinality(anchor_list)=0 AND (address IS NULL OR cardinality(address)=2))
      OR (trace_type='space_period' AND address IS NULL AND array_ndims(anchor_list)=1 AND cardinality(anchor_list) BETWEEN 2 AND 80)
      OR (trace_type='space_trace' AND address IS NULL AND array_ndims(anchor_list)=2
        AND array_length(anchor_list,2)=2 AND array_length(anchor_list,1) BETWEEN 1 AND 400))$SQL$,
      obj||'_trace',obj||'_trace_record_shape');
    EXECUTE format('COMMENT ON COLUMN silver.%I.anchor_list IS %L',obj||'_trace',
      'space_period: ordered 4-char anchor UIDs; space_trace: independent endpoint pairs; space_anchor: empty');
    EXECUTE format('SELECT count(*) FROM silver.%I WHERE trace_type=''space_road''',obj||'_trace') INTO c_after;
    IF c_after<>0 THEN RAISE EXCEPTION 'Old Trace route type remains'; END IF;
  END LOOP;
  SELECT count(*) INTO c_after FROM silver.lo3rwang_trace WHERE trace_type='space_period';
  IF c_after<c_before THEN RAISE EXCEPTION 'Route data lost'; END IF;
END $rename$;