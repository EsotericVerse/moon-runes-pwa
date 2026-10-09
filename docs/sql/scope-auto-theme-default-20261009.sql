-- Align the stored provision_scope signature default with the public system day/night Theme.
-- This migration does not change existing Scope theme selections.
DO $theme_default$
DECLARE
  v_before text;
  v_after text;
BEGIN
  SELECT pg_get_functiondef('api.provision_scope(text,text,text,date,text,text,text,text,boolean)'::regprocedure)
    INTO v_before;
  v_after := replace(v_before,
    'p_theme text DEFAULT ''theme-7''::text',
    'p_theme text DEFAULT ''system-default''::text');
  v_after := replace(v_after,
    'coalesce(p_theme,''theme-7'')',
    'coalesce(p_theme,''system-default'')');
  IF v_after=v_before OR v_after NOT LIKE '%p_theme text DEFAULT ''system-default''::text%'
    OR v_after NOT LIKE '%coalesce(p_theme,''system-default'')%' THEN
      RAISE EXCEPTION 'Unexpected provision_scope Theme default contract';
  END IF;
  EXECUTE v_after;
END;
$theme_default$;
