// OAuth 2.1 public-client facade for LOC MCP. GitHub OAuth proves the human
// identity, then this server issues revocable LOC tokens for MCP clients.
// PKCE is mandatory; tokens are opaque, hashed at rest and never GitHub tokens.
const txt=new TextEncoder();
const rand=()=>btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
  .replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'');
const hash=async value=>{
  const bytes=await crypto.subtle.digest('SHA-256',txt.encode(String(value)));
  return Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');
};
const deny=(message,status=400)=>Object.assign(new Error(message),{status});
function allowedCallback(value){
  let url;
  try{url=new URL(value)}catch{throw deny('Invalid MCP OAuth redirect URI')}
  const loopback=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
  if(!((url.protocol==='https:')||(loopback&&url.protocol==='http:'))||
     url.username||url.password||url.hash||value.length>512||
     (url.protocol==='https:'&&url.hostname==='localhost'))
    throw deny('Invalid MCP OAuth redirect URI');
  return url.href;
}
export async function registerMcpClient(storage,input){
  if(!input||typeof input!=='object'||Array.isArray(input)||!Array.isArray(input.redirect_uris)||
     input.redirect_uris.length<1||input.redirect_uris.length>5||
     !['none',undefined].includes(input.token_endpoint_auth_method)||
     input.grant_types?.some(x=>x!=='authorization_code')||
     input.response_types?.some(x=>x!=='code'))
    throw deny('Unsupported MCP OAuth client');
  const redirect_uris=input.redirect_uris.map(allowedCallback);
  const client_id='locc_'+rand();
  const client={client_id,redirect_uris,client_name:String(input.client_name||'LOC MCP client').slice(0,80),
    token_endpoint_auth_method:'none',grant_types:['authorization_code'],response_types:['code']};
  await storage.put('mcp-client:'+await hash(client_id),client);
  return client;
}
async function clientFor(storage,client_id,redirect_uri){
  if(!/^locc_[A-Za-z0-9_-]{43}$/.test(String(client_id)))throw deny('Unknown OAuth client',401);
  const client=await storage.get('mcp-client:'+await hash(client_id));
  if(!client||!client.redirect_uris.includes(allowedCallback(redirect_uri)))
    throw deny('OAuth redirect URI not registered',401);
  return client;
}
export async function validateMcpAuthorization(storage,args){
  const client_id=String(args.client_id||''),redirect_uri=String(args.redirect_uri||'');
  await clientFor(storage,client_id,redirect_uri);
  if(args.response_type!=='code'||args.code_challenge_method!=='S256'||
     !/^[A-Za-z0-9_-]{43}$/.test(String(args.code_challenge||''))||
     typeof args.state!=='string'||args.state.length<16||args.state.length>300)
    throw deny('Invalid OAuth authorization request');
  const scopes=String(args.scope||'').split(' ').filter(Boolean);
  if(scopes.some(x=>!['profile','email'].includes(x)))throw deny('Unsupported scope');
  return {client_id,redirect_uri,code_challenge:args.code_challenge,
    state:args.state,scope:scopes.join(' ')};
}
export async function issueMcpCode(storage,args,identity){
  const request=await validateMcpAuthorization(storage,args);
  if(identity?.provider!=='github'||!/^github:[1-9][0-9]*$/.test(String(identity.subject))||
     identity.expires_at<=Date.now())throw deny('GitHub LOC Session required',401);
  const code='loccode_'+rand();
  await storage.put('mcp-code:'+await hash(code),{
    ...request,subject:identity.subject,email:identity.email,until:Date.now()+300000
  });
  const callback=new URL(request.redirect_uri);
  callback.searchParams.set('code',code);
  callback.searchParams.set('state',request.state);
  return callback.href;
}
export async function exchangeMcpCode(storage,params){
  if(params.grant_type!=='authorization_code')throw deny('Unsupported OAuth grant');
  const key='mcp-code:'+await hash(params.code||'');
  const request=await storage.get(key);
  await storage.delete(key);
  if(!request||request.until<Date.now())throw deny('OAuth code expired',401);
  if(request.client_id!==params.client_id||request.redirect_uri!==params.redirect_uri)
    throw deny('OAuth client mismatch',401);
  await clientFor(storage,request.client_id,request.redirect_uri);
  if(!/^[A-Za-z0-9_-]{43,128}$/.test(String(params.code_verifier||'')))
    throw deny('Invalid PKCE verifier',401);
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',
    txt.encode(params.code_verifier)));
  const challenge=btoa(String.fromCharCode(...digest)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'');
  if(challenge!==request.code_challenge)throw deny('PKCE challenge mismatch',401);
  const access_token='locm_'+rand();
  const session={provider:'github',subject:request.subject,email:request.email,
    scope:request.scope,expires_at:Date.now()+24*3600000};
  await storage.put('mcp-token:'+await hash(access_token),session);
  return {access_token,token_type:'Bearer',expires_in:86400,scope:session.scope};
}
export async function mcpSession(storage,token){
  if(!/^locm_[A-Za-z0-9_-]{43}$/.test(String(token)))return null;
  const key='mcp-token:'+await hash(token);
  const session=await storage.get(key);
  if(!session)return null;
  if(session.expires_at<=Date.now()){await storage.delete(key);return null;}
  if(session.provider!=='github'||!/^github:[1-9][0-9]*$/.test(String(session.subject))||
     !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(session.email)))return null;
  return session;
}
