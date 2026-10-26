-- Canonical route name, with one atomic conversion and all original UID/Queue values retained.
-- County is not required, read or stored in these Scope Trace relations.
BEGIN;
CREATE OR REPLACE FUNCTION silver.trace_prevent_identity_change() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'pg_catalog', 'silver' AS $$
BEGIN
 IF NEW.uid IS DISTINCT FROM OLD.uid
   OR (NEW.trace_type IS DISTINCT FROM OLD.trace_type AND NOT
     (OLD.trace_type='space_road' AND NEW.trace_type='space_period')) THEN
   RAISE EXCEPTION 'Trace UID or record type cannot be changed';
 END IF;
 RETURN NEW;
END $$;
DO $$
DECLARE t text; fname text; definition text;
BEGIN
 FOR fname IN SELECT unnest(ARRAY['validate_scoped_trace_map','protect_scoped_trace_anchor']) LOOP
  SELECT pg_get_functiondef(p.oid) INTO definition
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='silver' AND p.proname=fname;
  IF definition IS NULL THEN RAISE EXCEPTION 'Required function % missing',fname; END IF;
  EXECUTE replace(definition,'space_road','space_period');
 END LOOP;
 FOR t IN SELECT unnest(ARRAY['lo3rwang_trace','lrunes_trace']) LOOP
  EXECUTE format('ALTER TABLE silver.%I DROP CONSTRAINT %I',t,t||'_trace_type_check');
  EXECUTE format('ALTER TABLE silver.%I DROP CONSTRAINT %I',t,t||'_record_shape');
  EXECUTE format('UPDATE silver.%I SET trace_type = ''space_period'' WHERE trace_type = ''space_road''',t);
  EXECUTE format('ALTER TABLE silver.%I ADD CONSTRAINT %I CHECK (trace_type IN (''space_anchor'',''space_period'',''space_trace''))',
    t,t||'_trace_type_check');
  EXECUTE format('ALTER TABLE silver.%I ADD CONSTRAINT %I CHECK (
    (trace_type=''space_anchor'' AND cardinality(anchor_list)=0 AND (address IS NULL OR cardinality(address)=2))
    OR (trace_type=''space_period'' AND address IS NULL AND array_ndims(anchor_list)=1 AND cardinality(anchor_list) BETWEEN 2 AND 80)
    OR (trace_type=''space_trace'' AND address IS NULL AND array_ndims(anchor_list)=2
        AND array_length(anchor_list,2)=2 AND array_length(anchor_list,1) BETWEEN 1 AND 400))',
    t,t||'_record_shape');
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION silver.trace_prevent_identity_change() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'pg_catalog', 'silver' AS $$
BEGIN
 IF NEW.uid IS DISTINCT FROM OLD.uid OR NEW.trace_type IS DISTINCT FROM OLD.trace_type THEN
  RAISE EXCEPTION 'Trace UID or record type cannot be changed';
 END IF;
 RETURN NEW;
END $$;
DO $$
BEGIN
 IF (SELECT count(*) FROM silver.lo3rwang_trace WHERE trace_type='space_anchor')<>581
   OR EXISTS(SELECT 1 FROM silver.lo3rwang_trace WHERE trace_type='space_road')
   OR EXISTS(SELECT 1 FROM silver.lrunes_trace WHERE trace_type='space_road') THEN
  RAISE EXCEPTION 'Space period cutover validation failed';
 END IF;
END $$;
COMMIT;
