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
