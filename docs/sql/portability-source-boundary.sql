-- Active PostgreSQL SQL editor: read-only supplement to the catalog inventory.
-- Contains canonical management permissions and private LOC records.
-- Export as an attachment; do not publish this result in the Git repository.
SELECT jsonb_build_object(
  'policies',(SELECT jsonb_agg(to_jsonb(p) ORDER BY schemaname,tablename,policyname)
    FROM pg_policies p WHERE schemaname IN ('silver','api')),
  'identity_helpers',(SELECT jsonb_agg(jsonb_build_object(
      'schema',n.nspname,'name',p.proname,'arguments',pg_get_function_identity_arguments(p.oid),
      'definition',pg_get_functiondef(p.oid)) ORDER BY p.proname)
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='auth' AND p.proname IN ('jwt','user_id') AND p.prokind='f'),
  'sequence_settings',(SELECT jsonb_agg(to_jsonb(s)) FROM pg_sequences s WHERE schemaname='silver'),
  'manage',(SELECT coalesce(jsonb_agg(to_jsonb(m) ORDER BY id,email),'[]'::jsonb) FROM silver.manage m),
  'user_records',(SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY owner_id,id),'[]'::jsonb) FROM api.user_records r),
  'user_settings',(SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY owner_id,setting_key),'[]'::jsonb) FROM api.user_settings s),
  'suno_instruction_counts',(SELECT jsonb_build_object(
      'all',(SELECT count(*) FROM silver.lo3rwang_galaxy WHERE source_name='suno' AND content_type='instruction'),
      'searchable',(SELECT count(*) FROM silver.lo3rwang_galaxy WHERE source_name='suno' AND content_type='instruction' AND searchable)))
) AS boundary;
