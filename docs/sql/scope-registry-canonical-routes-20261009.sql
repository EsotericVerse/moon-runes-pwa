-- Domain and Directory are exclusive Registry route identities, not DNS configuration.
-- Canonical built-in routes are reserved and can never be reused by another Scope.
-- New generic Scope/Group routes are generated strictly from their Scope ID.
CREATE UNIQUE INDEX IF NOT EXISTS scope_registry_unique_domain
  ON silver.scope_registry (lower(domain)) WHERE domain IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS scope_registry_unique_directory
  ON silver.scope_registry (lower(directory)) WHERE directory IS NOT NULL;

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
