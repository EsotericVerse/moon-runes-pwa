// LOC MCP HTTP entry point. No database write is granted by an OAuth login.
export const MCP_RESOURCE=(process.env.LOC_MCP_RESOURCE_URL||'https://loc.lo3rwang.cc/mcp').replace(/\/+$/,'');
export const CLERK_ISSUER=(process.env.LOC_CLERK_ISSUER||'https://precise-grackle-3371.clerk.accounts.dev').replace(/\/+$/,'');
const RESOURCE_METADATA=MCP_RESOURCE.replace(/\/mcp$/,'')+'/.well-known/oauth-protected-resource/mcp';
const SCOPES=['profile','email'];
const DEFAULT_PROTOCOL='2025-06-18';
const SUPPORTED_PROTOCOLS=new Set(['2025-03-26','2025-06-18','2025-11-25']);
const COMMON_HEADERS={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
  'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Headers':'Authorization, Content-Type, MCP-Protocol-Version, MCP-Session-Id',
  'Access-Control-Allow-Methods':'GET, POST, OPTIONS', 'Access-Control-Expose-Headers':'WWW-Authenticate, MCP-Session-Id'};

function response(body,status=200,extra={}){
  return new Response(body==null?null:JSON.stringify(body),{
    status,headers:{...COMMON_HEADERS,...(body==null?{}:{'Content-Type':'application/json; charset=utf-8'}),...extra}
  });
}
export function preflight(){return response(null,204);}
export function protectedResourceMetadata(){
  return response({resource:MCP_RESOURCE,authorization_servers:[CLERK_ISSUER],
    bearer_methods_supported:['header'],scopes_supported:SCOPES});
}
function unauthorized(){
  return response({error:'unauthorized',error_description:'Clerk OAuth access token required'},401,{
    'WWW-Authenticate':'Bearer resource_metadata="'+RESOURCE_METADATA+'", scope="'+SCOPES.join(' ')+'"'
  });
}
function base64url(text){
  const normalized=text.replace(/-/g,'+').replace(/_/g,'/');
  const bin=atob(normalized);
  return Uint8Array.from(bin,c=>c.charCodeAt(0));
}
function decodeJson(text){return JSON.parse(new TextDecoder().decode(base64url(text)));}
let jwksCache=null;
async function getKeys(){
  if(jwksCache&&jwksCache.expiry>Date.now())return jwksCache.keys;
  const r=await fetch(CLERK_ISSUER+'/.well-known/jwks.json',
    {headers:{accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(6500)});
  if(!r.ok)throw new Error('Clerk JWKS unavailable');
  const data=await r.json();
  if(!Array.isArray(data?.keys))throw new Error('Invalid Clerk JWKS');
  jwksCache={keys:data.keys,expiry:Date.now()+300000};
  return data.keys;
}
// Only signed, non-expired OAuth JWTs explicitly bound to this MCP resource are accepted.
// Session JWTs, arbitrary bearer strings and tokens for other audiences are never accepted.
async function verifyOAuthToken(token){
  const parts=token.split('.');
  if(parts.length!==3) return null; // Clerk opaque tokens require separate server-side verification.
  const header=decodeJson(parts[0]);
  const claims=decodeJson(parts[1]);
  if(header?.alg!=='RS256'||!header?.kid||claims?.iss!==CLERK_ISSUER||
    !/^user_[A-Za-z0-9]+$/.test(String(claims.sub||'')))return null;
  const now=Math.floor(Date.now()/1000);
  if(!Number.isFinite(claims.exp)||claims.exp<=now||
    (claims.nbf!=null&&(!Number.isFinite(claims.nbf)||claims.nbf>now+60))||
    (claims.iat!=null&&(!Number.isFinite(claims.iat)||claims.iat>now+60)))return null;
  const audiences=Array.isArray(claims.aud)?claims.aud:[claims.aud];
  if(!audiences.includes(MCP_RESOURCE))return null;
  const keys=await getKeys();
  const jwk=keys.find(k=>k.kid===header.kid&&k.kty==='RSA'&&
    (!k.alg||k.alg==='RS256')&&(!k.use||k.use==='sig'));
  if(!jwk)return null;
  const key=await crypto.subtle.importKey('jwk',jwk,
    {name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  const good=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,base64url(parts[2]),
    new TextEncoder().encode(parts[0]+'.'+parts[1]));
  if(!good)return null;
  return {subject:claims.sub,scopes:String(claims.scope||'').split(/\s+/).filter(Boolean)};
}
function result(id,value){return response({jsonrpc:'2.0',id,result:value});}
function rpcError(id,code,message,httpStatus=200){
  return response({jsonrpc:'2.0',id,error:{code,message}},httpStatus);
}
const TOOLS=[{name:'loc_connection_status',description:'Read-only confirmation that LOC MCP and Clerk OAuth are connected. Does not expose private Galaxy data.',
  inputSchema:{type:'object',properties:{},additionalProperties:false},
  annotations:{readOnlyHint:true,destructiveHint:false}}];
export async function handleMcp(request){
  if(request.method==='OPTIONS')return preflight();
  if(!['GET','POST'].includes(request.method))return response({error:'method_not_allowed'},405,{Allow:'GET, POST, OPTIONS'});
  const match=/^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization')||'');
  if(!match)return unauthorized();
  let identity=null;
  try{identity=await verifyOAuthToken(match[1]);}catch{return unauthorized();}
  if(!identity)return unauthorized();
  if(request.method==='GET')return response({error:'SSE_not_supported',message:'Use Streamable HTTP POST'},405,{Allow:'POST, OPTIONS'});
  let payload;
  try{payload=await request.json();}catch{return rpcError(null,-32700,'Invalid JSON',400);}
  if(!payload||Array.isArray(payload)||payload.jsonrpc!=='2.0'||typeof payload.method!=='string')
    return rpcError(payload?.id??null,-32600,'Invalid JSON-RPC request',400);
  if(payload.id==null)return response(null,202); // JSON-RPC notifications have no reply.
  switch(payload.method){
    case 'initialize':{
      const proposed=payload.params?.protocolVersion;
      return result(payload.id,{protocolVersion:SUPPORTED_PROTOCOLS.has(proposed)?proposed:DEFAULT_PROTOCOL,
        capabilities:{tools:{listChanged:false}},serverInfo:{name:'loc-mcp',version:'0.1.0'},
        instructions:'LOC MCP connection is active. Galaxy data tools are not enabled yet.'});
    }
    case 'ping':return result(payload.id,{});
    case 'tools/list':return result(payload.id,{tools:TOOLS});
    case 'tools/call':
      if(payload.params?.name!=='loc_connection_status')return rpcError(payload.id,-32602,'Unknown tool');
      return result(payload.id,{content:[{type:'text',text:JSON.stringify({connected:true,provider:'clerk',
        subject:identity.subject,resource:MCP_RESOURCE,galaxyWriteEnabled:false})}]});
    default:return rpcError(payload.id,-32601,'Method not found');
  }
}
