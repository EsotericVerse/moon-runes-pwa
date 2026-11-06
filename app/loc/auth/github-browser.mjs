// First-party GitHub identity adapter. GitHub is contacted only during OAuth;
// day-to-day requests use a revocable LOC Authority Session, not GitHub APIs.
export function createGitHubAccountAdapter({authorityOrigin='https://auth.lo3rwang.cc',
  fetchImpl=globalThis.fetch,navigate=path=>globalThis.location.assign(path)}={}){
  const origin=new URL(authorityOrigin);
  if(origin.protocol!=='https:'||origin.username||origin.password||origin.search||
     origin.hash||!['','/'].includes(origin.pathname))
    throw new Error('Invalid LOC Authority origin');
  const authority=origin.origin;
  let credentials=null,pending=null,providerPromise=null;
  const listeners=new Set();
  const emit=(event,session)=>{for(const fn of listeners)fn(event,session);};
  async function configured(){
    providerPromise??=fetchImpl(authority+'/v1/github/status',{
      credentials:'include',cache:'no-store'
    }).then(async response=>{
      if(!response.ok)throw new Error('LOC Auth provider status unavailable');
      return Boolean((await response.json())?.configured);
    }).catch(error=>{providerPromise=null;throw error;});
    return providerPromise;
  }
  async function session({force=false}={}){
    if(!force&&credentials&&credentials.until>Date.now())
      return credentials.value;
    if(pending)return pending;
    const read=(async()=>{
      if(!await configured())return null;
      const response=await fetchImpl(authority+'/v1/github/session',{
        credentials:'include',cache:'no-store',headers:{accept:'application/json'}
      });
      if(response.status===401){credentials=null;return null;}
      if(!response.ok)throw new Error('LOC Session validation unavailable');
      const user=await response.json();
      if(user.provider!=='github'||!/^github:[1-9][0-9]*$/.test(String(user.subject))||
         typeof user.access_token!=='string'||!user.access_token.startsWith('loc_')||
         typeof user.email!=='string'||!user.email.includes('@')||
         !(user.expires_at>Date.now()))throw Error('Invalid LOC GitHub Session');
      const account={id:user.subject,email:user.email};
      const value={user:account,oauth:{provider:'github',providerId:user.subject,
        userId:user.subject,email:user.email},
        session:{user:account,access_token:user.access_token}};
      credentials={value,until:Math.min(Date.now()+30_000,user.expires_at)};
      return value;
    })();
    pending=read;
    try{return await read}finally{if(pending===read)pending=null;}
  }
  const auth={
    getVerifiedSession:()=>session(),
    getAccessToken:async()=>((await session())?.session?.access_token||''),
    async getSession(){
      try{return {data:{session:(await session())?.session||null},error:null}}
      catch(error){return {data:{session:null},error}}
    },
    async getUser(token){
      try{
        const current=await session({force:true});
        if(!current||current.session.access_token!==token)
          throw Error('LOC GitHub token mismatch');
        return {data:{user:current.user},error:null};
      }catch(error){return {data:{user:null},error};}
    },
    async signInWithOAuth({provider}={}){
      if(provider!=='github'&&provider!=='google')return {data:null,error:Error('Unsupported provider')};
      try{
        if(!await configured())throw Error('GitHub OAuth not configured');
        const response=await fetchImpl(authority+'/v1/github/start',{
          credentials:'include',cache:'no-store',headers:{accept:'application/json'}
        });
        if(!response.ok)throw Error('GitHub OAuth unavailable');
        const body=await response.json();
        const target=new URL(body.authorization_url);
        if(target.origin!=='https://github.com'||target.pathname!=='/login/oauth/authorize')
          throw Error('Unexpected GitHub OAuth endpoint');
        navigate(target.href);
        return {data:{},error:null};
      }catch(error){return {data:null,error}}
    },
    async signOut(){
      try{
        const response=await fetchImpl(authority+'/v1/github/logout',{
          method:'POST',credentials:'include',cache:'no-store'
        });
        if(!response.ok)throw Error('LOC sign-out failed');
        credentials=null;emit('SIGNED_OUT',null);
        return {error:null};
      }catch(error){return {error}}
    },
    onAuthStateChange(callback){
      listeners.add(callback);
      void session().then(value=>callback('INITIAL_SESSION',value?.session||null))
        .catch(()=>callback('INITIAL_SESSION',null));
      return {data:{subscription:{unsubscribe:()=>listeners.delete(callback)}}};
    }
  };
  return Object.freeze({auth,getAccessToken:auth.getAccessToken,configured});
}
