-- The unified silver.loc_scope migration installs access-grant visibility there.
-- Access grants have record_type = 'access_grant'; authenticated users read their own
-- grants, and admin scope managers can read all grants.
DROP POLICY IF EXISTS loc_scope_private_select ON silver.loc_scope;
CREATE POLICY loc_scope_private_select ON silver.loc_scope FOR SELECT TO authenticated
USING (api.has_scope_access('admin',ARRAY['scope_manager']::text[])
 OR (record_type='scope' AND api.has_scope_access(scope_id,ARRAY['scope_manager']::text[]))
 OR (record_type='relation_request' AND (requested_by=api.current_scope_user_id() OR api.can_review_scope_relation(parent_scope_id,child_scope_id)))
 OR (record_type='access_grant' AND (user_id=api.current_scope_user_id() OR api.has_scope_access(scope_id,ARRAY['scope_manager']::text[])))
 OR (record_type='content_audit' AND api.can_manage_scope(scope_id)));
