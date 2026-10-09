-- Canonical Scope route identity: two mutually exclusive columns.
-- The canonical LunaRunes and Author scopes are LOC Directory routes.
CREATE UNIQUE INDEX IF NOT EXISTS scope_registry_unique_domain
  ON silver.scope_registry (lower(domain)) WHERE domain IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS scope_registry_unique_directory
  ON silver.scope_registry (lower(directory)) WHERE directory IS NOT NULL;

CREATE OR REPLACE FUNCTION silver.domain_has_repeated_labels(p_domain text)
RETURNS boolean LANGUAGE sql IMMUTABLE STRICT SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM unnest(string_to_array(lower(p_domain),'.')) label
    GROUP BY label HAVING count(*)>1
  );
$$;

ALTER TABLE silver.scope_registry DROP CONSTRAINT IF EXISTS scope_registry_canonical_route_check;
ALTER TABLE silver.scope_registry
  ADD CONSTRAINT scope_registry_canonical_route_check
  CHECK (
    (domain IS NULL) <> (directory IS NULL)
    AND CASE
      WHEN scope_id='loc' THEN domain='loc.lo3rwang.cc' AND directory IS NULL
      WHEN scope_id='admin' THEN domain='admin.lo3rwang.cc' AND directory IS NULL
      WHEN scope_id='lrunes' THEN domain='lrunes.lo3rwang.cc' AND directory IS NULL
      WHEN scope_id='lo3rwang' THEN domain IS NULL AND directory='/lo3rwang'
      ELSE (domain IS NOT NULL AND domain=scope_id||'.lo3rwang.cc' AND directory IS NULL)
        OR (directory IS NOT NULL AND directory='/'||scope_id AND domain IS NULL)
    END
  );

ALTER TABLE silver.scope_registry DROP CONSTRAINT IF EXISTS scope_registry_no_repeated_domain_labels;
ALTER TABLE silver.scope_registry
  ADD CONSTRAINT scope_registry_no_repeated_domain_labels
  CHECK (domain IS NULL OR NOT silver.domain_has_repeated_labels(domain));
