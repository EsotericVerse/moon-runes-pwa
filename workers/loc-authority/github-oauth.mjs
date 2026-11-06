// GitHub is only the initial identity proof; LOC owns short-lived sessions.
// No GitHub token, OAuth secret or Session credential is stored in the browser's
// localStorage or in the LOC Galaxy database.
const STATE_COOKIE='__Host-loc-github-state';
const SESSION_COOKIE='__Host-loc-session';
const OAUTH_TTL=10*60*1000;
const SESSION_TTL=2*60*60*1000;
const enc=new TextEncoder();
const random=()=>{const b=crypto.getRandomValues(new Uint8Array(32));return btoa(String.fromCharCode(...b)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'');};
const fingerprint=async value=>{
  const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(value)));
  return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
};
const error=(message,status=400)=>Object.assign(new Error(message),{status});
export const githubCookies=Object.freeze({state:STATE_COOKIE,session:SESSION_COOKIE});
export function readOAuthCookie(header,name){
  const found=String(header||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='));
  return found?found.slice(name.length+1):'';
}
export function sessionCookie(token,maxAge=7200){
  return SESSION_COOKIE+'='+token+'; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age='+maxAge;
}
export function stateCookie(state,maxAge=600){
  return STATE_COOKIE+'='+state+'; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age='+maxAge;
}
export async function beginGitHubOAuth(storage,profile){
  if(!profile?.client_id||!profile?.client_secret||!profile?.callback_url)
    throw error('GitHub OAuth is not configured',503);
  const state=random(),verifier=random();
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(verifier)));
  const challenge=btoa(String.fromCharCode(...digest)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'');
  await storage.put('github-oauth:'+await fingerprint(state),
    {verifier,until:Date.now()+OAUTH_TTL});
  const url=new URL('https://github.com/login/oauth/authorize');
  for(const [key,val] of Object.entries({
    client_id:profile.client_id,redirect_uri:profile.callback_url,state,
    code_challenge:challenge,code_challenge_method:'S256',scope:'user:email'
  }))url.searchParams.set(key,val);
  return {authorization_url:url.href,state};
}
export async function completeGitHubOAuth(storage,profile,{code,state,cookieState},fetchImpl=fetch){
  if(!/^[A-Za-z0-9_-]{20,200}$/.test(String(state||''))||
     !/^[A-Za-z0-9_-]{8,256}$/.test(String(code||''))||
     !cookieState||cookieState!==state)throw error('OAuth state mismatch',403);
  const key='github-oauth:'+await fingerprint(state);
  const pending=await storage.get(key);
  // A state is single-use, including failed exchanges.
  await storage.delete(key);
  if(!pending||pending.until<Date.now())throw error('OAuth authorization expired',401);
  const reply=await fetchImpl('https://github.com/login/oauth/access_token',{
    method:'POST',headers:{accept:'application/json','content-type':'application/json'},
    body:JSON.stringify({client_id:profile.client_id,client_secret:profile.client_secret,
      code,redirect_uri:profile.callback_url,code_verifier:pending.verifier}),
    redirect:'error',signal:AbortSignal.timeout(8000)
  });
  if(!reply.ok)throw error('GitHub OAuth exchange unavailable',502);
  const payload=await reply.json();
  const oauthToken=String(payload?.access_token||'');
  if(payload.error||!/^gh[osu]_[A-Za-z0-9_]+$/.test(oauthToken)&&
    !/^[a-f0-9]{40}$/.test(oauthToken))
    throw error('GitHub OAuth exchange rejected',401);
  const headers={authorization:'Bearer '+oauthToken,accept:'application/vnd.github+json',
    'user-agent':'LOC-Auth'};
  const [userResponse,emailResponse]=await Promise.all([
    fetchImpl('https://api.github.com/user',{headers,redirect:'error',signal:AbortSignal.timeout(8000)}),
    fetchImpl('https://api.github.com/user/emails',{headers,redirect:'error',signal:AbortSignal.timeout(8000)})
  ]);
  if(!userResponse.ok||!emailResponse.ok)throw error('GitHub identity verification unavailable',502);
  const [user,emails]=await Promise.all([userResponse.json(),emailResponse.json()]);
  if(!Number.isSafeInteger(user?.id)||user.id<1||!Array.isArray(emails))
    throw error('GitHub identity is invalid',401);
  const verified=emails.find(item=>item?.primary===true&&item?.verified===true&&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(item?.email||'')));
  if(!verified)throw error('GitHub verified primary email required',403);
  const token='loc_'+random();
  const identity={provider:'github',subject:'github:'+user.id,
    email:String(verified.email).toLowerCase(),session:'loc-session',
    expires_at:Date.now()+SESSION_TTL};
  await storage.put('github-session:'+await fingerprint(token),identity);
  return {token,identity:{...identity,expires_at:identity.expires_at}};
}
export async function findGitHubSession(storage,token){
  if(!/^loc_[A-Za-z0-9_-]{43}$/.test(String(token||'')))return null;
  const key='github-session:'+await fingerprint(token);
  const identity=await storage.get(key);
  if(!identity)return null;
  if(identity.expires_at<=Date.now()){
    await storage.delete(key);return null;
  }
  if(identity.provider!=='github'||!/^github:[1-9][0-9]*$/.test(identity.subject)||
     !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity.email))return null;
  return identity;
}
export async function revokeGitHubSession(storage,token){
  if(!/^loc_[A-Za-z0-9_-]{43}$/.test(String(token||'')))return false;
  await storage.delete('github-session:'+await fingerprint(token));
  return true;
}
