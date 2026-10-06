import {createPostgrestAdapter} from './postgrest.mjs';

const DEFAULT_NEON_DATA_API_URL='https://ep-rapid-queen-b3oyboy6.apirest.c-4.ap-southeast-1.aws.neon.tech/neondb/rest/v1';
const DEFAULT_NEON_AUTH_URL='https://ep-rapid-queen-b3oyboy6.neonauth.c-4.ap-southeast-1.aws.neon.tech/neondb/auth';

let publicToken='';
let publicTokenExpiresAt=0;
let publicTokenRequest=null;

function dataApiUrl(){
  const configured=String(process.env.NEXT_PUBLIC_NEON_DATA_API_URL||DEFAULT_NEON_DATA_API_URL).trim().replace(/\/+$/,'');
  return configured.endsWith('/rest/v1')?configured:`${configured}/rest/v1`;
}
function authUrl(){
  return String(process.env.NEXT_PUBLIC_NEON_AUTH_URL||DEFAULT_NEON_AUTH_URL).trim().replace(/\/+$/,'');
}
function normalizeExpiry(value){
  const n=Number(value);
  if(!Number.isFinite(n)||n<=0)return Date.now()+60_000;
  return n>1e12?n:n*1000;
}
async function getNeonPublicToken(){
  const now=Date.now();
  if(publicToken&&now<publicTokenExpiresAt-30_000)return publicToken;
  if(publicTokenRequest)return publicTokenRequest;
  publicTokenRequest=(async()=>{
    const response=await fetch(authUrl()+'/token/anonymous',{
      method:'GET',
      headers:{accept:'application/json'},
      cache:'no-store'
    });
    let payload=null;
    try{payload=await response.json()}catch{}
    if(!response.ok||!payload?.token){
      const message=String(payload?.message||payload?.error||`HTTP ${response.status}`);
      const error=new Error('Neon anonymous token failed: '+message);
      error.status=response.status;
      throw error;
    }
    publicToken=String(payload.token);
    publicTokenExpiresAt=normalizeExpiry(payload.expires_at);
    return publicToken;
  })();
  try{return await publicTokenRequest}
  finally{publicTokenRequest=null}
}

export function createNeonPublicAdapter(){
  return createPostgrestAdapter({
    url:dataApiUrl(),
    auth:null,
    getPublicToken:getNeonPublicToken
  });
}
