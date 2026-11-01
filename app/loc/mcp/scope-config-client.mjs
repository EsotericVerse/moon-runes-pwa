// Browser-only secure Scope database configuration. Never send API credentials
// through MCP tool arguments, URLs, the SQL Gateway, or client-side storage.
const SCOPE=/^[a-z][a-z0-9]{0,14}$/;
const TABLE=/^[a-z][a-z0-9_]{0,62}$/;

export async function scopeConfigRequest({scopeid,token,values,fetchImpl=globalThis.fetch}={}){
  if(!SCOPE.test(String(scopeid||'')))throw new Error('Invalid Scope ID');
  if(typeof token!=='string'||!token.trim())throw new Error('Clerk login required');
  if(values!==undefined){
    if(!values||typeof values!=='object'||Array.isArray(values)||
      !TABLE.test(String(values.schema||''))||!TABLE.test(String(values.table||''))||
      typeof values.endpoint!=='string'||!values.endpoint.startsWith('https://'))
      throw new Error('An existing table, schema and HTTPS Data API are required');
    if(typeof values.api_key!=='string'||values.api_key.length>4096)
      throw new Error('Invalid database credential');
  }
  const configResponse=await fetchImpl('/recovery/config.json',{
    cache:'no-store',credentials:'same-origin',signal:AbortSignal.timeout(8000)
  });
  if(!configResponse.ok)throw new Error('LOC Authority configuration unavailable');
  const config=await configResponse.json();
  const authority=new URL(String(config.controlUrl||''));
  if(authority.protocol!=='https:'||authority.username||authority.password||
    authority.search||authority.hash||!['','/'].includes(authority.pathname))
    throw new Error('LOC Authority must use a trusted HTTPS origin');
  const response=await fetchImpl(authority.origin+'/v1/mcp/scope/'+scopeid,{
    method:values===undefined?'GET':'PUT',cache:'no-store',credentials:'omit',
    redirect:'error',signal:AbortSignal.timeout(12000),
    headers:{authorization:'Bearer '+token,accept:'application/json',
      ...(values!==undefined?{'content-type':'application/json'}:{})},
    ...(values!==undefined?{body:JSON.stringify(values)}:{})
  });
  if(response.status===403)throw new Error('Scope Group authorization required');
  if(response.status===401)throw new Error('Clerk login expired');
  if(!response.ok)throw new Error('LOC Scope database service returned HTTP '+response.status);
  const result=await response.json();
  if(!result||typeof result!=='object'||Array.isArray(result))
    throw new Error('Invalid LOC Scope configuration response');
  return result;
}
