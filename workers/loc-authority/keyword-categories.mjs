// Category metadata belongs to the Scope Group. Identity matches
// read_shared_keyword_classes: SHA-256(UTF8(scopeid + ':' + Class UID)).
const SCOPE=/^[a-z][a-z0-9]{0,14}$/;
const CLASS_UID=/^[A-Za-z0-9]{4}$/;
export function validateKeywordCategoryEntry(groupid,scopeid,classUid,members=[]){
  if(!SCOPE.test(String(groupid||''))||!SCOPE.test(String(scopeid||''))||
      !CLASS_UID.test(String(classUid||'')))
    throw Object.assign(new Error('Invalid keyword Category identifier'),{status:400});
  if(groupid===scopeid||!members.includes(scopeid))
    throw Object.assign(new Error('Scope is not a Group member'),{status:403});
  return {scopeid,class:String(classUid)};
}
export async function hashKeywordCategory(scopeid,classUid){
  const bytes=new TextEncoder().encode(scopeid+':'+classUid);
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
}

// The Group authority rechecks the *public* Class-only RPC on every import.
// Do not trust a browser's UID or a prior public/private state.
export async function readPublicKeywordClasses(scopeid,{fetchImpl=fetch,env={}}={}){
  if(!SCOPE.test(String(scopeid||'')))throw Object.assign(new Error('Invalid Scope'),{status:400});
  const url=String(env.LOC_KEYWORD_PUBLIC_SUPABASE_URL||'https://qlouywsdiiyiyzpoxyqy.supabase.co').replace(/\/+$/,'');
  const apiKey=String(env.LOC_KEYWORD_PUBLIC_SUPABASE_KEY||'sb_publishable_qPn0vAzozVyXKllRuEKf2Q_fvG-pLVV');
  const response=await fetchImpl(url+'/rest/v1/rpc/read_shared_keyword_classes',{
    method:'POST',headers:{apikey:apiKey,authorization:'Bearer '+apiKey,
      'content-type':'application/json','accept-profile':'silver','content-profile':'silver'},
    body:JSON.stringify({p_scope_id:scopeid}),redirect:'error',
    signal:AbortSignal.timeout(8000)
  });
  if(!response.ok)throw Object.assign(new Error('Public Class verification unavailable'),{status:503});
  const rows=await response.json();
  if(!Array.isArray(rows))throw Object.assign(new Error('Invalid public Class directory'),{status:502});
  // SQL function enumerates only type='class' records that are shared.
  return rows.filter(row=>row?.scopeId===scopeid&&CLASS_UID.test(row.classUid));
}
export async function assertPublicKeywordClass(scopeid,classUid,options){
  const rows=await readPublicKeywordClasses(scopeid,options);
  if(!rows.some(row=>row.classUid===classUid))
    throw Object.assign(new Error('Only a public Class UID may be imported'),{status:403});
  return true;
}
