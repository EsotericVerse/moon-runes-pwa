-- Match grant visibility to the unified identity and scope access model.
-- The admin scope manager can read every grant; each scope manager can read only
-- grants within that scope; every authenticated user can read their own grant.
DROP POLICY scope_access_grants_scoped_read ON api.scope_access_grants;
CREATE POLICY scope_access_grants_scoped_read
  ON api.scope_access_grants
  FOR SELECT TO authenticated
  USING (
    user_id = api.current_scope_user_id()
    OR api.has_scope_access('admin', ARRAY['scope_manager'])
    OR api.has_scope_access(scope_id, ARRAY['scope_manager'])
  );
