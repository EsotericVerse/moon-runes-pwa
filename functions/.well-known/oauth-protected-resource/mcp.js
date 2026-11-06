// Do not advertise an OAuth provider while LOC MCP is disabled.
export function onRequest(){
  return Response.json({error:'LOC_MCP_DISABLED'},
    {status:410,headers:{'cache-control':'no-store'}});
}
