// OAuth discovery is retired together with the MCP HTTP endpoint.
export function onRequest(){
  return Response.json({error:'LOC_MCP_DISABLED'},
    {status:410,headers:{'cache-control':'no-store'}});
}
