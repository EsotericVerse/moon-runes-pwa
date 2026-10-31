import { DurableObject } from 'cloudflare:workers';
// LOC independent recovery control plane. Never imports a database client or Supabase Auth.
// The separate Worker is provisioned only when Clerk + root identity + encryption secrets exist.
const JSON_HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
const ID=/^[a-z][a-z0-9_-]{0,63}$/;
const ENGINES=new Set(['postgres','mysql','mssql']);
function fail(message,status=400){return Object.assign(new Error(message),{status});}
function b64bytes(value){
  const value64=String(value).replace(/-/g,'+').replace(/_/g,'/');
  if(!/^[A-Za-z0-9+/]*={0,2}$/.test(value64))throw fail('Invalid encoding',401);
  const raw=atob(value64.padEnd(Math.ceil(value64.length/4)*4,'='));
  return Uint8Array.from(raw,character=>character.charCodeAt(0));
}
function fromBytes(bytes){return btoa(String.fromCharCode(...bytes));}
function json(data,status=200,origin=''){
  return new Response(JSON.stringify(data),{status,headers:{...JSON_HEADERS,...(origin?{'access-control-allow-origin':origin,'vary':'origin'}:{})}});
}
function allowedOrigin(request,env){
  const origin=request.headers.get('origin')||'';
  const configured=String(env.LOC_CONTROL_ORIGIN||'').replace(/\/$/,'');
  if(!/^https:\/\/[^/]+$/.test(configured))throw fail('Control origin is not configured',503);
  if(origin&&origin!==configured)throw fail('Origin not allowed',403);
  return origin;
}
// Clerk's JWKS origin is pinned to the trusted deployment issuer, not JWT data.
// The deployment can use accounts.dev or its custom Production HTTPS domain.
function isClerkIssuer(value){
  try{
    const url=new URL(String(value||''));
    return url.protocol==='https:'&&!url.username&&!url.password&&!url.search&&!url.hash&&
      ['','/'].includes(url.pathname)&&Boolean(url.hostname)&&
      !url.hostname.endsWith('.local');
  }catch{return false;}
}
const jwksCache=new Map();
async function clerkPublicKey(issuer,kid){
  if(!isClerkIssuer(issuer))throw fail('Clerk issuer is not trusted',503);
  if(!/^[A-Za-z0-9._-]{1,256}$/.test(String(kid||'')))throw fail('Invalid signing key ID',401);
  const key=issuer+'#'+kid;
  const cached=jwksCache.get(key);
  if(cached&&cached.expires>Date.now())return cached.key;
  const response=await fetch((String(issuer).endsWith('/')?String(issuer).slice(0,-1):String(issuer))+'/.well-known/jwks.json',{
    method:'GET',redirect:'error',signal:AbortSignal.timeout(6000),
    headers:{accept:'application/json'}
  });
  if(!response.ok)throw fail('Clerk signing keys are unavailable',503);
  const body=await response.text();
  if(body.length>120000)throw fail('Clerk signing key response too large',503);
  let keys;try{keys=JSON.parse(body).keys}catch{throw fail('Invalid Clerk signing keys',503)}
  if(!Array.isArray(keys))throw fail('Invalid Clerk signing keys',503);
  const jwk=keys.find(value=>value?.kid===kid&&value.kty==='RSA'&&
    (!value.alg||value.alg==='RS256')&&
    (!value.use||value.use==='sig')&&typeof value.n==='string'&&
    typeof value.e==='string');
  if(!jwk)throw fail('Clerk signing key is not recognized',401);
  const cryptoKey=await crypto.subtle.importKey('jwk',jwk,
    {name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  jwksCache.set(key,{key:cryptoKey,expires:Date.now()+5*60*1000});
  if(jwksCache.size>16)jwksCache.delete(jwksCache.keys().next().value);
  return cryptoKey;
}
function requireSetup(env){
  const hasClerk=Boolean(env.LOC_CLERK_ISSUER&&env.LOC_RECOVERY_ROOT_CLERK_IDS&&
    (env.LOC_CLERK_JWT_PUBLIC_KEY||isClerkIssuer(env.LOC_CLERK_ISSUER)));
  const hasAlternative=Boolean(env.LOC_SECONDARY_ISSUER&&env.LOC_SECONDARY_JWT_PUBLIC_KEY&&
    env.LOC_SECONDARY_AUDIENCE&&env.LOC_RECOVERY_ROOT_SECONDARY_SUBJECTS);
  if((!hasClerk&&!hasAlternative)||!env.LOC_CONTROL_ORIGIN||
    !env.LOC_CONTROL_ENCRYPTION_KEY||!env.LOC_AUTHORITY_STATE)
    throw fail('Recovery control is not configured',503);
}
async function verifyIdentityToken(request,env){
  const match=/^Bearer ([A-Za-z0-9_\-.]+)$/.exec(request.headers.get('authorization')||'');
  if(!match||match[1].length>8192)throw fail('Authentication required',401);
  const pieces=match[1].split('.');
  if(pieces.length!==3)throw fail('Invalid token',401);
  let header,claims;
  try{
    header=JSON.parse(new TextDecoder().decode(b64bytes(pieces[0])));
    claims=JSON.parse(new TextDecoder().decode(b64bytes(pieces[1])));
  }catch{throw fail('Invalid token',401)}
  if(header?.alg!=='RS256'||!claims||typeof claims!=='object')throw fail('Invalid token algorithm',401);
  const origin=String(env.LOC_CONTROL_ORIGIN).replace(/\/$/,'');
  const issuer=String(claims.iss||'').replace(/\/$/,'');
  const clerk=Boolean(env.LOC_CLERK_ISSUER&&issuer===String(env.LOC_CLERK_ISSUER).replace(/\/$/,''));
  const secondary=Boolean(env.LOC_SECONDARY_ISSUER&&issuer===String(env.LOC_SECONDARY_ISSUER).replace(/\/$/,''));
  if(!clerk&&!secondary)throw fail('Unknown identity issuer',401);
  const now=Math.floor(Date.now()/1000);
  if(typeof claims.sub!=='string'||!claims.sub||claims.sub.length>128||
    !Number.isInteger(claims.exp)||claims.exp<=now||
    !Number.isInteger(claims.iat)||claims.iat>now+5||
    !Number.isInteger(claims.nbf)||claims.nbf>now+5||
    claims.sts==='pending'||claims.act)throw fail('Session is not valid',401);
  if(clerk&&(claims.azp!==origin||!/^user_[A-Za-z0-9]+$/.test(claims.sub)||
    typeof claims.sid!=='string'||!claims.sid.startsWith('sess_')))throw fail('Clerk session is not valid',401);
  if(secondary&&(!env.LOC_SECONDARY_AUDIENCE||
    !(Array.isArray(claims.aud)?claims.aud.includes(env.LOC_SECONDARY_AUDIENCE):claims.aud===env.LOC_SECONDARY_AUDIENCE)))
    throw fail('Invalid token audience',401);
  let verified=false;
  try{
    let key;
    if(clerk&&!env.LOC_CLERK_JWT_PUBLIC_KEY){
      key=await clerkPublicKey(env.LOC_CLERK_ISSUER,header.kid);
    }else{
      const pem=String(clerk?env.LOC_CLERK_JWT_PUBLIC_KEY:env.LOC_SECONDARY_JWT_PUBLIC_KEY);
      const body=pem.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s/g,'');
      if(!body)throw fail('Recovery signing key unavailable',503);
      key=await crypto.subtle.importKey('spki',b64bytes(body),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
    }
    verified=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,b64bytes(pieces[2]),new TextEncoder().encode(pieces[0]+'.'+pieces[1]));
  }catch(error){
    if(error?.status)throw error;
    throw fail('Token verification failed',401);
  }
  if(!verified)throw fail('Token signature invalid',401);
  // Email is usable for legacy management grants only when it is a VERIFIED,
  // cryptographically signed identity claim. Never promote SDK/local input.
  const email=String(claims.email||'').trim().toLowerCase();
  const verifiedEmail=claims.email_verified===true&&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)?email:'';
  return {provider:clerk?'clerk':'secondary',subject:claims.sub,
    session:clerk?claims.sid:'verified',email:verifiedEmail};
}
function validateTarget(input,id){
  if(!ID.test(id)||!input||typeof input!=='object'||Array.isArray(input))throw fail('Invalid target');
  const engine=String(input.engine||'');
  const host=String(input.host||'').trim().toLowerCase();
  const database=String(input.database||'').trim();
  const username=String(input.username||'').trim();
  const label=String(input.label||id).trim();
  const port=Number(input.port);
  if(!ENGINES.has(engine)||!/^[a-z0-9.-]{1,253}$/.test(host)||host.startsWith('.')||host.endsWith('.')||
    !Number.isInteger(port)||port<1||port>65535||
    !/^[a-zA-Z0-9_\-]{1,120}$/.test(database)||!username||username.length>120||!label||label.length>120)
    throw fail('Invalid database connection metadata');
  const password=input.password;
  if(password!==undefined&&(typeof password!=='string'||password.length>4096))throw fail('Invalid database secret');
  return {id,engine,host,port,database,username,label,...(password?{password}:{})};
}
async function encryptionKey(secret){
  const bytes=b64bytes(secret);
  if(bytes.length!==32)throw fail('Control encryption key must be 32 bytes',503);
  return crypto.subtle.importKey('raw',bytes,'AES-GCM',false,['encrypt','decrypt']);
}
async function encryptProfile(profile,secret){
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const key=await encryptionKey(secret);
  const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(profile)));
  return fromBytes(iv)+'.'+fromBytes(new Uint8Array(cipher));
}
async function decryptProfile(value,secret){
  const parts=String(value).split('.');
  if(parts.length!==2)throw fail('Invalid saved target',503);
  const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv:b64bytes(parts[0])},await encryptionKey(secret),b64bytes(parts[1]));
  return JSON.parse(new TextDecoder().decode(bytes));
}
export class LocAuthorityState extends DurableObject {
  constructor(ctx,env){super(ctx,env);}
  async listState(){
    const saved=await this.ctx.storage.list({prefix:'target:'});
    const targets=[];
    for(const [key,item] of saved)targets.push({id:key.slice(7),...item.public});
    // Built-in routable providers are managed by the independent Gateway and
    // require no user-entered DB password or modification of the existing Link.
    for(const [id,label] of [['supabase-current','Supabase'],['neon-current','Neon']]){
      if(!targets.some(target=>target.id===id))targets.push({
        id,label,engine:'postgres',managed:true
      });
    }
    targets.sort((a,b)=>a.id.localeCompare(b.id));
    return {primary_id:await this.ctx.storage.get('primary_id')||'supabase-current',targets};
  }
  async putTarget(id,input){
    const validated=validateTarget(input,id);
    const old=await this.ctx.storage.get('target:'+id);
    if(!validated.password&&!old)throw fail('New target requires a password');
    const profile=validated.password?validated:{...validated,password:(await decryptProfile(old.encrypted,this.env.LOC_CONTROL_ENCRYPTION_KEY)).password};
    const {password,...publicFields}=profile;
    await this.ctx.storage.put('target:'+id,{
      public:publicFields,
      encrypted:await encryptProfile(profile,this.env.LOC_CONTROL_ENCRYPTION_KEY)
    });
    return publicFields;
  }
  async selectPrimary(id){
    const builtin=id==='supabase-current'||id==='neon-current';
    const target=builtin?{id}:await this.ctx.storage.get('target:'+id);
    if(!target)throw fail('Unknown primary target');
    await this.ctx.storage.put('primary_id',id);
    return {primary_id:id};
  }
  // LOC Authority is stored outside *every* business SQL database.
  // Scope inheritance is never implicit: a rule applies to its exact Scope.
  async listGrants(){
    const saved=await this.ctx.storage.list({prefix:'grant:'});
    return [...saved].map(([key,grant])=>({key:key.slice(6),...grant}))
      .sort((a,b)=>a.key.localeCompare(b.key));
  }
  async putGrant(input){
    if(!input||typeof input!=='object'||Array.isArray(input))throw fail('Invalid grant');
    const provider=String(input.provider||'').trim();
    const subject=String(input.subject||'').trim();
    const scope=String(input.scope||'').trim().toLowerCase();
    const actions=input.actions;
    const expires=Number(input.expires_at);
    if(!/^[a-z][a-z0-9_-]{0,31}$/.test(provider)||
      !/^[a-zA-Z0-9_:-]{1,128}$/.test(subject)||
      !/^[a-z][a-z0-9]{0,14}$/.test(scope)||
      !Array.isArray(actions)||!actions.length||actions.length>16||
      actions.some(action=>!['read','write','manage','configure'].includes(action))||
      !Number.isSafeInteger(expires)||expires<=Date.now()||expires>Date.now()+366*24*60*60*1000)
      throw fail('Invalid Authority grant');
    const unique=[...new Set(actions)].sort();
    const key=provider+':'+subject+':'+scope;
    await this.ctx.storage.put('grant:'+key,{provider,subject,scope,actions:unique,expires_at:expires});
    return {key,provider,subject,scope,actions:unique,expires_at:expires};
  }
  async revokeGrant(key){
    if(!/^[a-z][a-z0-9_-]{0,31}:[a-zA-Z0-9_:-]{1,128}:[a-z][a-z0-9]{0,14}$/.test(String(key)))
      throw fail('Invalid grant key');
    await this.ctx.storage.delete('grant:'+key);
    return {revoked:true,key};
  }
  // Internal RPC for a trusted SQL gateway. The external provider's JWT must
  // be VERIFIED by the gateway before passing provider + subject here.
  async mayAccess({provider,subject,scope,action}={}){
    if(!['read','write','manage','configure'].includes(action))return false;
    if(!/^[a-z][a-z0-9]{0,14}$/.test(String(scope||'')))return false;
    const key='grant:'+provider+':'+subject+':'+scope;
    const grant=await this.ctx.storage.get(key);
    return Boolean(grant&&grant.expires_at>Date.now()&&grant.actions.includes(action));
  }
  async getPrimaryProfileForGateway(){
    const id=await this.ctx.storage.get('primary_id');
    if(!id)return null;
    return this.getProfileForGateway(id);
  }
  // Cloudflare DO RPC: only a separately bound trusted SQL gateway can call this.
  // No HTTP handler exposes the credential or returns decrypted profiles to a browser.
  async getProfileForGateway(id){
    const stored=await this.ctx.storage.get('target:'+id);
    return stored?decryptProfile(stored.encrypted,this.env.LOC_CONTROL_ENCRYPTION_KEY):null;
  }
}
export default {
  async fetch(request,env){
    let origin='';
    try{
      requireSetup(env);
      origin=allowedOrigin(request,env);
      if(request.method==='OPTIONS'){
        if(!origin)throw fail('Origin required',403);
        return new Response(null,{status:204,headers:{
          'access-control-allow-origin':origin,'access-control-allow-methods':'GET,PUT,POST,OPTIONS',
          'access-control-allow-headers':'authorization,content-type',
          'access-control-max-age':'600','vary':'origin'
        }});
      }
      if(!origin&&request.headers.get('sec-fetch-site')==='cross-site')throw fail('Cross-origin request rejected',403);
      if(!['GET','PUT','POST'].includes(request.method))throw fail('Method not allowed',405);
      const principal=await verifyIdentityToken(request,env);
      const url=new URL(request.url);
      if(!url.pathname.startsWith('/v1/'))throw fail('Not found',404);
      // Identity endpoint is only a verified principal lookup. It grants no
      // data access or management capabilities; the gateway must call mayAccess.
      if(request.method==='GET'&&url.pathname==='/v1/identity')return json(principal,200,origin);
      const roots=String(principal.provider==='clerk'?env.LOC_RECOVERY_ROOT_CLERK_IDS:env.LOC_RECOVERY_ROOT_SECONDARY_SUBJECTS)
        .split(/[\s,;]+/).filter(Boolean);
      if(!roots.includes(principal.subject))throw fail('Recovery administrator required',403);
      const stub=env.LOC_AUTHORITY_STATE.get(env.LOC_AUTHORITY_STATE.idFromName('loc-authority-control-v1'));
      if(request.method==='GET'&&url.pathname==='/v1/me')return json(principal,200,origin);
      if(request.method==='GET'&&url.pathname==='/v1/state')return json(await stub.listState(),200,origin);
      if(request.method==='GET'&&url.pathname==='/v1/grants')return json({grants:await stub.listGrants()},200,origin);
      if(request.method==='PUT'&&url.pathname==='/v1/grants'){
        const raw=await request.text();if(raw.length>3000)throw fail('Request too large',413);
        let input;try{input=JSON.parse(raw)}catch{throw fail('Invalid JSON')}
        return json(await stub.putGrant(input),200,origin);
      }
      if(request.method==='POST'&&url.pathname==='/v1/revoke'){
        const raw=await request.text();if(raw.length>1000)throw fail('Request too large',413);
        let input;try{input=JSON.parse(raw)}catch{throw fail('Invalid JSON')}
        return json(await stub.revokeGrant(input?.key),200,origin);
      }
      const match=/^\/v1\/targets\/([a-z][a-z0-9_-]{0,63})$/.exec(url.pathname);
      if(request.method==='PUT'&&match){
        const raw=await request.text();
        if(raw.length>10_000)throw fail('Request too large',413);
        let value;try{value=JSON.parse(raw)}catch{throw fail('Invalid JSON')}
        return json(await stub.putTarget(match[1],value),200,origin);
      }
      if(request.method==='POST'&&url.pathname==='/v1/primary'){
        const raw=await request.text();
        if(raw.length>1000)throw fail('Request too large',413);
        let input;try{input=JSON.parse(raw)}catch{throw fail('Invalid JSON')}
        if(!ID.test(String(input?.id||'')))throw fail('Invalid primary target');
        // Preference is persisted here. The current LOC app still uses its
        // existing deployed routing until a trusted SQL Gateway is connected.
        const selected=await stub.selectPrimary(input.id);
        return json({...selected,runtime_connected:false},200,origin);
      }
      throw fail('Not found',404);
    }catch(error){
      const code=Number(error?.status)||500;
      return json({error:code>=500?'Recovery control unavailable':String(error.message)},code,origin);
    }
  }
};
