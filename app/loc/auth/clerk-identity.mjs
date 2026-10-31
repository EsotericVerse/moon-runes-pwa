// Independent LOC identity boundary. No Supabase, Neon or SQL imports.
// Verification is performed by a trusted LOC Authority endpoint, never by
// trusting a browser's user email, cached user object or a decoded JWT.
function exactOrigin(value){
  const url=new URL(String(value||''));
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||
    !['','/'].includes(url.pathname))throw new Error('Authority endpoint must be an HTTPS origin');
  return url.origin;
}
export function clerkReturnPath(value,origin){
  const site=new URL(origin);
  const candidate=String(value||'/local/settings/');
  if(candidate.includes('\\')||candidate.startsWith('//'))return '/local/settings/';
  const relative=candidate.startsWith('/');
  const absolute=candidate.startsWith('https://');
  if(!relative&&!absolute)return '/local/settings/';
  try{
    const parsed=new URL(candidate,site);
    return parsed.origin===site.origin?parsed.pathname+parsed.search+parsed.hash:'/local/settings/';
  }catch{return '/local/settings/';}
}
export function createIndependentClerkIdentity({loadClerk,authorityOrigin,
  fetchImpl=globalThis.fetch,navigate=path=>globalThis.location.assign(path),
  siteOrigin=globalThis.location?.origin}={}){
  if(typeof loadClerk!=='function')throw new Error('Clerk loader is required');
  if(typeof fetchImpl!=='function')throw new Error('HTTPS fetch is required');
  const authority=exactOrigin(authorityOrigin);
  const origin=exactOrigin(siteOrigin);
  let currentPromise=null;
  const client=()=>currentPromise??=Promise.resolve().then(loadClerk).catch(error=>{
    currentPromise=null;
    throw error;
  });
  async function token(){
    const clerk=await client();
    if(!clerk?.session||!clerk.user?.id)return null;
    const jwt=await clerk.session.getToken();
    if(!jwt||typeof jwt!=='string')throw new Error('Clerk did not provide a session token');
    return jwt;
  }
  async function verifiedIdentity(){
    const clerk=await client();
    const jwt=await token();
    if(!jwt)return null;
    const response=await fetchImpl(authority+'/v1/identity',{
      method:'GET',cache:'no-store',credentials:'omit',
      headers:{authorization:'Bearer '+jwt,accept:'application/json'}
    });
    if(!response.ok)throw new Error('LOC Authority rejected Clerk identity (HTTP '+response.status+')');
    const identity=await response.json();
    if(identity?.provider!=='clerk'||identity.subject!==clerk.user?.id||
      typeof identity.session!=='string'||!identity.session.startsWith('sess_'))
      throw new Error('Clerk identity mismatch');
    return Object.freeze({
      provider:'clerk',subject:identity.subject,session:identity.session
    });
  }
  async function getAccessToken(){
    const jwt=await token();
    if(!jwt)throw new Error('Clerk login required');
    return jwt;
  }
  async function signIn(returnTo='/local/settings/'){
    const destination='/login/index.html?return_to='+
      encodeURIComponent(clerkReturnPath(returnTo,origin));
    navigate(destination);
  }
  async function signOut(){
    const clerk=await client();
    await clerk.signOut();
  }
  async function onChange(callback){
    if(typeof callback!=='function')throw new Error('Auth listener must be a function');
    const clerk=await client();
    return clerk.addListener(()=>callback(Boolean(clerk.session&&clerk.user)));
  }
  return Object.freeze({verifiedIdentity,getAccessToken,signIn,signOut,onChange});
}
