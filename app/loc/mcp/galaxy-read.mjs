// LOC MCP public Galaxy reads. The LOC SQL Gateway and PostgreSQL anonymous RLS
// enforce public visibility; an OAuth identity alone never grants private data access.
const PUBLIC_ORIGIN='https://loc.lo3rwang.cc';
const DEFAULT_GATEWAY='https://loc-sql-gateway.sopa2306.workers.dev';
const PUBLIC_SCOPE='lo3rwang';
const TABLE=PUBLIC_SCOPE+'_galaxy';
const UID=/^[A-Za-z0-9]{8}$/;

function clientError(message){return Object.assign(new Error(message),{code:'INVALID_ARGUMENT'});}
function gatewayOrigin(env){
  const value=String(env.LOC_MCP_PUBLIC_SQL_GATEWAY||DEFAULT_GATEWAY).replace(/\/+$/,'');
  const url=new URL(value);
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/')
    throw new Error('Invalid LOC public SQL Gateway configuration');
  return url.origin;
}
async function galaxyRows(filters,env={},fetchImpl=globalThis.fetch){
  const url=new URL(gatewayOrigin(env)+'/rest/v1/'+TABLE);
  for(const [key,value] of Object.entries(filters))url.searchParams.set(key,String(value));
  // Intentionally omit Authorization. The Gateway will use its public provider
  // identity and the existing SELECT + RLS policy on the known Galaxy table.
  const res=await fetchImpl(url.href,{
    method:'GET',headers:{origin:PUBLIC_ORIGIN,'accept-profile':'silver',accept:'application/json'},
    signal:AbortSignal.timeout(8500),redirect:'error',cache:'no-store'
  });
  if(!res.ok)throw Object.assign(new Error('LOC public Galaxy read unavailable (HTTP '+res.status+')'),
    {code:'BACKEND_UNAVAILABLE'});
  const rows=await res.json();
  if(!Array.isArray(rows))throw Object.assign(new Error('LOC Galaxy returned an invalid response'),
    {code:'BACKEND_UNAVAILABLE'});
  return rows;
}
function scopeAllowed(scopeid){
  if(scopeid!==undefined&&scopeid!==PUBLIC_SCOPE)
    throw clientError('Only the lo3rwang public Galaxy scope is currently configured');
}
function escapeIlike(value){
  // PostgREST logic-tree string: escape quotes and backslashes, then SQL LIKE
  // wildcards. The MCP caller never supplies an operator or column name.
  return String(value).replace(/\\/g,'\\\\').replace(/"/g,'\\"')
    .replace(/([%_*])/g,'\\$1');
}
export async function searchMemory(args={},env={},fetchImpl=globalThis.fetch){
  scopeAllowed(args.scopeid);
  if(typeof args.query!=='string')throw clientError('query is required');
  const term=args.query.trim();
  if(term.length<2||term.length>100||/[\u0000-\u001f\u007f]/.test(term))
    throw clientError('query must contain 2–100 characters without control characters');
  const limit=args.limit===undefined?10:Number(args.limit);
  if(!Number.isInteger(limit)||limit<1||limit>20)throw clientError('limit must be between 1 and 20');
  const offset=args.offset===undefined?0:Number(args.offset);
  if(!Number.isInteger(offset)||offset<0||offset>500)
    throw clientError('offset must be between 0 and 500');
  const pattern='"*'+escapeIlike(term)+'*"';
  const rows=await galaxyRows({
    select:'uid,title,date,createtime',
    or:'(title.ilike.'+pattern+',content.ilike.'+pattern+')',
    searchable:'eq.true',order:'date.desc.nullslast,createtime.desc.nullslast',
    limit,offset
  },env,fetchImpl);
  return {scopeid:PUBLIC_SCOPE,visibility:'public',query:term,limit,offset,
    results:rows.map(row=>({uid:String(row.uid||'').trim(),title:row.title||'',
      date:row.date||null,createtime:row.createtime||null})),
    has_more:rows.length===limit};
}
export async function readMemory(args={},env={},fetchImpl=globalThis.fetch){
  scopeAllowed(args.scopeid);
  const uid=String(args.uid||'').trim();
  if(!UID.test(uid))throw clientError('uid must be an 8-character, case-sensitive Base62 ID');
  const offset=args.offset===undefined?0:Number(args.offset);
  const maxChars=args.max_chars===undefined?20000:Number(args.max_chars);
  if(!Number.isInteger(offset)||offset<0||offset>1000000)throw clientError('offset must be 0–1000000');
  if(!Number.isInteger(maxChars)||maxChars<1||maxChars>40000)
    throw clientError('max_chars must be 1–40000');
  const rows=await galaxyRows({
    select:'uid,title,content,date,createtime,site,url',uid:'eq.'+uid,
    searchable:'eq.true',limit:1
  },env,fetchImpl);
  if(!rows.length)return {found:false,scopeid:PUBLIC_SCOPE,uid,visibility:'public'};
  const row=rows[0],content=String(row.content||'');
  return {found:true,scopeid:PUBLIC_SCOPE,visibility:'public',uid:String(row.uid||'').trim(),
    title:row.title||'',date:row.date||null,createtime:row.createtime||null,
    site:row.site||null,url:row.url||null,content:content.slice(offset,offset+maxChars),
    offset,total_chars:content.length,next_offset:offset+maxChars<content.length?offset+maxChars:null};
}
