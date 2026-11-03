-- Safe transitional policy: old and new clients may write different flag formats
-- until all app, Authority, and Edge Function deployments have completed.
-- Do NOT remove authorized Scope-manager visibility or site restrictions.
DO $galaxy_visibility$
DECLARE p record; next_qual text;
BEGIN
  FOR p IN
    SELECT schemaname,tablename,policyname,qual
    FROM pg_policies
    WHERE schemaname='silver'
      AND tablename IN ('lo3rwang_galaxy','lrunes_galaxy')
      AND cmd='SELECT'
      AND qual LIKE '%able%'
  LOOP
    IF p.qual LIKE '%search IS NOT FALSE%' THEN CONTINUE; END IF;
    next_qual:=replace(p.qual,
      $old$((able ->> 'search'::text))::boolean IS TRUE$old$,
      $new$(((able ->> 'search'::text))::boolean IS TRUE AND search IS NOT FALSE)$new$);
    IF next_qual=p.qual THEN
      RAISE EXCEPTION 'Unexpected legacy Galaxy visibility predicate: %',p.policyname;
    END IF;
    EXECUTE format('ALTER POLICY %I ON %I.%I USING (%s)',
      p.policyname,p.schemaname,p.tablename,next_qual);
  END LOOP;
END $galaxy_visibility$;