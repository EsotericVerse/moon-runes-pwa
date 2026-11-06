// LOC MCP has been explicitly retired. Do not import the MCP router here:
 // importing it could validate Clerk JWTs, fetch JWKS or call Authority.
export function onRequest(){
  return Response.json({
    error:'LOC_MCP_DISABLED',
    message:'LOC MCP is disabled. Use the local CLI workflow instead.'
  },{status:410,headers:{'cache-control':'no-store'}});
}
