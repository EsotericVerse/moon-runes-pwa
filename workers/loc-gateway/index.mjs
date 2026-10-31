// Independent LOC PostgREST transport. Intended for a standalone Cloudflare
// Worker, not the static Pages build. Upstream URLs never reach browsers.
// All authenticated requests require Clerk verified by LOC Authority AND
// provider RLS, and do not use Supabase Auth or Neon Auth sessions.
const EXPOSED=['content-type','content-range','etag','cache-control','x-request-id'];
const METHODS=new Set(['GET','HEAD','POST','PATCH','DELETE','OPTIONS']);
const RESOURCE=/^\/(?:[a-z][a-z0-9_]{0,62}|rpc\/[a-z][a-z0-9_]{0,62})$/;
// These RPCs are read-only and must additionally be granted to the remote
// anonymous Postgres role. All unlisted functions require verified identity.
const PUBLIC_READ_RPCS=new Set([
  'read_app_bootstrap','read_scope_statistics','read_scope_category_totals',
  'read_scope_overview','read_scope_earliest','read_loc_statistics',
  'read_scope_place_statistics','read_scope_keyword_suggestions',
  'read_keyword_tree_summary','read_keyword_tree_catalog',
  'read_shared_keyword_classes','read_music_style_tree',
  'search_scope_trace_place_names','read_trace_place_density',
  'read_trace_keyword_group_totals'
]);
const VALID_ORIGINS=/^https:\/\/[^/?#]+$/;
function response(message,status,origin=''){
  return new Response(JSON.stringify({message}),{
    status,headers:{'content-type':'application/json','cache-control':'no-store',
      ...(origin?{'access-control-allow-origin':origin,'vary':'origin'}:{})}
  });
}
function cors(origin){
  return {
    'access-control-allow-origin':origin,
    'access-control-allow-methods':'GET,HEAD,POST,PATCH,DELETE,OPTIONS',
    'access-control-allow-headers':'authorization,content-type,accept-profile,content-profile,prefer,range,apikey',
    'access-control-expose-headers':'content-range,etag,x-request-id',
    'access-control-max-age':'600',
    'vary':'origin'
  };
}
function validApiOrigin(value){
  const url=new URL(String(value||''));
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||
    !url.pathname.endsWith('/rest/v1'))throw Error('LOC database source not configured');
  return url.href.replace(/\/$/,'');
}
function activeTarget(state){
  const id=String(state?.primary_id||'supabase-current');
  if(id==='supabase-current')return 'supabase';
  if(id==='neon-current')return 'neon';
  throw Error('Selected database is not supported by this Gateway');
}
async function activeState(env){
  if(!env.LOC_AUTHORITY_STATE)throw Error('LOC Authority Durable Object not configured');
  const id=env.LOC_AUTHORITY_STATE.idFromName('loc-authority-control-v1');
  return env.LOC_AUTHORITY_STATE.get(id).listState();
}
async function verifyClerk(request,env){
  const token=request.headers.get('authorization');
  if(!token)return null;
  if(!/^Bearer [A-Za-z0-9._-]{24,8192}$/.test(token))return null;
  // Use a Cloudflare Service Binding, not a workers.dev-to-workers.dev
  // network hop. No external host is involved in verified identity checks.
  if(!env.LOC_AUTHORITY_SERVICE?.fetch)return null;
  const reply=await env.LOC_AUTHORITY_SERVICE.fetch(
    new Request('https://loc-authority-internal/v1/identity',{
      method:'GET',headers:{
        authorization:token,accept:'application/json',
        origin:env.LOC_PUBLIC_ORIGIN
      },signal:AbortSignal.timeout(6500)
    })
  );
  if(!reply.ok)return null;
  const identity=await reply.json();
  return identity?.provider==='clerk'&&String(identity.subject||'').startsWith('user_')
    ?identity:null;
}
let anonTokenCache=null;
let anonTokenPending=null;
async function neonAnonymousToken(env){
  const base=String(env.LOC_NEON_AUTH_URL||'').replace(/\/+$/,'');
  if(!base.endsWith('/auth'))throw Error('Neon anonymous token endpoint is not configured');
  if(anonTokenCache&&anonTokenCache.expires>Date.now())return anonTokenCache.value;
  if(!anonTokenPending)anonTokenPending=(async()=>{
    const result=await fetch(base+'/token/anonymous',{
      method:'GET',headers:{accept:'application/json'},redirect:'error',
      signal:AbortSignal.timeout(6000)
    });
    if(!result.ok)throw Error('Neon anonymous token service unavailable');
    const data=await result.json();
    const value=data?.token||data?.data?.token||data?.access_token;
    if(typeof value!=='string'||value.split('.').length!==3)
      throw Error('Neon anonymous token is invalid');
    anonTokenCache={value,expires:Date.now()+3*60*1000};
    return value;
  })().finally(()=>{anonTokenPending=null});
  return anonTokenPending;
}
function outboundHeaders(request,{token,provider,env}){
  const input=request.headers,headers=new Headers();
  for(const name of ['accept','accept-profile','content-profile','prefer','range','content-type','if-none-match']){
    const value=input.get(name);
    if(value)headers.set(name,value);
  }
  if(provider==='supabase'){
    headers.set('apikey',env.LOC_SUPABASE_PUBLISHABLE_KEY);
    if(!token)headers.set('authorization','Bearer '+env.LOC_SUPABASE_PUBLISHABLE_KEY);
  }
  if(token)headers.set('authorization',token);
  return headers;
}
async function upstream(provider,request,env,token){
  const base=provider==='neon'?env.LOC_NEON_DATA_API_URL:env.LOC_SUPABASE_DATA_API_URL;
  const endpoint=validApiOrigin(base);
  if(provider==='supabase'&&!env.LOC_SUPABASE_PUBLISHABLE_KEY)
    throw Error('Supabase publishable key is unavailable');
  const url=new URL(request.url), path=url.pathname.slice('/rest/v1'.length);
  const destination=endpoint+path+url.search;
  const neonToken=provider==='neon'&&!token?await neonAnonymousToken(env):'';
  const headers=outboundHeaders(request,{token:token||(neonToken?'Bearer '+neonToken:''),provider,env});
  return fetch(destination,{method:request.method,headers,
    ...(request.method==='GET'||request.method==='HEAD'?{}:{body:request.body,duplex:'half'}),
    redirect:'error',signal:AbortSignal.timeout(9000)});
}
// Explicit, root-only diagnostics. These probes never write or change the
// active route; the management RPC is a read-only SQL function.
async function probeRead(provider,env,token='',method='GET'){
  const isManagement=method==='POST';
  const path=isManagement?'/rest/v1/rpc/get_my_scope_management':
    '/rest/v1/lo3rwang_galaxy?select=uid&limit=1';
  try{
    const request=new Request('https://loc-gateway-internal'+path,{
      method,headers:{
        'accept':'application/json',
        ...(isManagement?{'content-type':'application/json','content-profile':'silver'}:
          {'accept-profile':'silver'})
      },
      ...(isManagement?{body:'{}'}:{})
    });
    const result=await upstream(provider,request,env,token);
    if(!result.ok)return {ok:false,status:result.status};
    if(!isManagement)return {ok:true,status:result.status};
    const rows=await result.json();
    return {ok:Array.isArray(rows)&&rows.length>0,status:result.status};
  }catch{return {ok:false,status:0}}
}
async function probeReadiness(request,env,principal,origin){
  const token=request.headers.get('authorization');
  if(!token||!principal)
    throw Object.assign(Error('Clerk login required'),{status:401});
  if(!env.LOC_AUTHORITY_SERVICE?.fetch)
    throw Error('Authority is unavailable');
  // Only a configured independent recovery root may query cross-provider
  // management readiness. A valid Clerk identity alone is NOT root access.
  const admin=await env.LOC_AUTHORITY_SERVICE.fetch(
    new Request('https://loc-authority-internal/v1/me',{
      method:'GET',headers:{
        authorization:token,origin:env.LOC_PUBLIC_ORIGIN,
        accept:'application/json'
      },signal:AbortSignal.timeout(6500)
    })
  );
  if(!admin.ok)
    throw Object.assign(Error('Recovery administrator required'),{status:403});
  const selected=activeTarget(await activeState(env));
  const [primaryPublic,backupPublic,primaryManagement,backupManagement]=await Promise.all([
    probeRead('supabase',env),
    probeRead('neon',env),
    probeRead('supabase',env,token,'POST'),
    probeRead('neon',env,token,'POST')
  ]);
  const info={
    primary:selected,
    clerk:{verified:true,verifiedEmail:Boolean(principal.email)},
    supabase:{publicRead:primaryPublic.ok,clerkManagementRead:primaryManagement.ok},
    neon:{publicRead:backupPublic.ok,clerkManagementRead:backupManagement.ok},
    writingTested:false,
    dataParityTested:false
  };
  return new Response(JSON.stringify(info),{
    status:200,headers:{...cors(origin),'content-type':'application/json',
      'cache-control':'no-store','x-content-type-options':'nosniff'}
  });
}
export default {
  async fetch(request,env){
    const origin=request.headers.get('origin')||'';
    const configured=String(env.LOC_PUBLIC_ORIGIN||'').replace(/\/$/,'');
    const allowed=Boolean(VALID_ORIGINS.test(configured)&&origin===configured);
    try{
      if(!allowed)throw Object.assign(Error('Origin not allowed'),{status:403});
      if(!METHODS.has(request.method))throw Object.assign(Error('Method not allowed'),{status:405});
      if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors(origin)});
      const url=new URL(request.url);
      if(url.pathname==='/v1/readiness'){
        if(request.method!=='GET')
          throw Object.assign(Error('Method not allowed'),{status:405});
        const principal=await verifyClerk(request,env);
        return await probeReadiness(request,env,principal,origin);
      }
      if(!url.pathname.startsWith('/rest/v1/'))
        throw Object.assign(Error('Unknown Gateway path'),{status:404});
      const path=url.pathname.slice('/rest/v1'.length);
      if(!RESOURCE.test(path))
        throw Object.assign(Error('Invalid SQL resource'),{status:403});
      const token=request.headers.get('authorization')||'';
      const principal=token?await verifyClerk(request,env):null;
      if(token&&!principal)
        throw Object.assign(Error('Independent identity verification failed'),{status:401});
      // All unauthenticated writes, including RPC POST, fail closed. Guest
      // reads may use only GET/HEAD to avoid opening unknown mutating RPCs.
      const publicReadRpc=request.method==='POST'&&path.startsWith('/rpc/')&&
        PUBLIC_READ_RPCS.has(path.slice('/rpc/'.length));
      if(!principal&&!['GET','HEAD'].includes(request.method)&&!publicReadRpc)
        throw Object.assign(Error('Clerk login required'),{status:401});
      // The trusted Clerk JWT is passed unchanged: provider-side RLS must
      // independently validate its JWKS/issuer/role/email before any write.
      const state=await activeState(env);
      const target=activeTarget(state);
      let result;
      try{result=await upstream(target,request,env,token);}
      catch(error){
        if(target!=='supabase'||!['GET','HEAD'].includes(request.method)||
          !env.LOC_NEON_DATA_API_URL)throw error;
      }
      // Only idempotent read requests fail over on upstream availability
      // failures. Never replay an ambiguous insert/update/delete.
      if((!result||[502,503,504].includes(result.status))&&target==='supabase'&&
        ['GET','HEAD'].includes(request.method)&&env.LOC_NEON_DATA_API_URL){
        result=await upstream('neon',request,env,token);
      }
      if(!result)throw Error('Gateway source unavailable');
      const headers=new Headers(cors(origin));
      for(const name of EXPOSED){
        const value=result.headers.get(name);
        if(value)headers.set(name,value);
      }
      headers.set('cache-control','no-store');
      headers.set('x-content-type-options','nosniff');
      // Preserve HTTP status and PostgREST result structure without leaking
      // upstream Location/Server response headers.
      return new Response(result.body,{status:result.status,headers});
    }catch(error){
      const status=Number(error?.status)||503;
      return response(status>=500?'LOC Gateway unavailable':error.message,status,allowed?origin:'');
    }
  }
};
