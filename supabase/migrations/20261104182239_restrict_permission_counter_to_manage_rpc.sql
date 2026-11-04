-- Only the SECURITY DEFINER manage RPC may reach the trace writer.
REVOKE EXECUTE ON FUNCTION silver.record_permission_check(text) FROM authenticated;
