let cachedPolicy=null;
let cachedAt=0;
const POLICY_TTL_MS=60_000;

function normalizePath(pathname='/'){
  const value='/' + String(pathname||'/')
    .split('/')
    .filter(Boolean)
    .join('/');
  return value==='/'?'/':value;
}

function originUrl(env,requestUrl,pathOverride=null){
  if(!env.ORIGIN_BASE)throw new Error('Missing ORIGIN_BASE');
  const source=new URL(requestUrl);
  const target=new URL(env.ORIGIN_BASE);
  const prefix=target.pathname.replace(/\/$/,'');
  const path=pathOverride??source.pathname;
  target.pathname=(prefix+path).replace(/\/+/g,'/');
  target.search=source.search;
  return target;
}

async function originFetch(request,env,pathOverride=null){
  const target=originUrl(env,request.url,pathOverride);
  const next=new Request(target.toString(),request);
  return fetch(next);
}

async function loadPolicy(env,request){
  const now=Date.now();
  if(cachedPolicy&&now-cachedAt<POLICY_TTL_MS)return cachedPolicy;

  const response=await originFetch(request,env,'/scope-route-policy.json');
  if(!response.ok)throw new Error('Scope route policy unavailable: '+response.status);

  const policy=await response.json();
  if(policy?.schema!==1||policy?.defaultPolicy!=='deny'||!policy?.hosts){
    throw new Error('Invalid Scope route policy');
  }

  cachedPolicy=policy;
  cachedAt=now;
  return policy;
}

function isDocumentRequest(request){
  if(!['GET','HEAD'].includes(request.method))return false;

  const destination=request.headers.get('sec-fetch-dest');
  if(destination==='document')return true;

  const mode=request.headers.get('sec-fetch-mode');
  if(mode==='navigate')return true;

  const accept=request.headers.get('accept')||'';
  return accept.includes('text/html');
}

function redirectTarget(url,redirect){
  const target=new URL(url.toString());
  target.hostname=redirect.toHost;
  target.protocol='https:';

  const base=String(redirect.toBase||'').replace(/\/+$/,'');
  const local=normalizePath(url.pathname);
  target.pathname=local==='/'?base||'/':base+local;

  return target;
}

export default {
  async fetch(request,env){
    const url=new URL(request.url);

    // Static assets/data are not Scope page routes; let the origin serve them normally.
    if(!isDocumentRequest(request)){
      return originFetch(request,env);
    }

    let policy;
    try{
      policy=await loadPolicy(env,request);
    }catch(error){
      return new Response('Scope routing policy unavailable',{status:503});
    }

    const hostPolicy=policy.hosts[url.hostname];
    if(!hostPolicy){
      return new Response('Not Found',{status:404});
    }

    const pathname=normalizePath(url.pathname);
    if(!hostPolicy.allow.includes(pathname)){
      return new Response('Not Found',{status:404});
    }

    if(hostPolicy.redirect){
      return Response.redirect(redirectTarget(url,hostPolicy.redirect).toString(),302);
    }

    return originFetch(request,env);
  }
};
