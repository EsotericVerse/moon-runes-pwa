-- Temporary rune keyword editor. Anonymous visitors can update only the two
-- keyword fields for one rune through this RPC; the silver table stays non-writable.
BEGIN;
CREATE OR REPLACE FUNCTION api.update_lrune_keywords(
  p_rune_number integer,
  p_positive_keywords text,
  p_negative_keywords text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, silver
AS $function$
BEGIN
  IF p_rune_number IS NULL OR p_rune_number < 0 OR p_rune_number > 66 THEN
    RAISE EXCEPTION 'Invalid rune number' USING ERRCODE = '22023';
  END IF;
  IF char_length(coalesce(p_positive_keywords, '')) > 3000
     OR char_length(coalesce(p_negative_keywords, '')) > 3000 THEN
    RAISE EXCEPTION 'Rune keywords exceed the allowed length' USING ERRCODE = '22023';
  END IF;
  UPDATE silver.lrunes_style
  SET positive_keywords = coalesce(p_positive_keywords, ''),
      negative_keywords = coalesce(p_negative_keywords, '')
  WHERE rune_number = p_rune_number;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rune keyword record not found' USING ERRCODE = 'P0002';
  END IF;
END
$function$;
REVOKE ALL ON FUNCTION api.update_lrune_keywords(integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION api.update_lrune_keywords(integer, text, text) TO anonymous, authenticated;
COMMIT;
