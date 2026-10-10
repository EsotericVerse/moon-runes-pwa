// Two scalar user_settings.text_value entries, never a JSON/JSONB document.
export const HOME_SETTING_KEY='loc-home-scope-v1';
export const FAVORITES_SETTING_KEY='loc-favorite-scopes-v1';
export const DEFAULT_FAVORITES=Object.freeze(['lrunes','lo3rwang','loc']);
const VALID_SCOPE=/^[a-z][a-z0-9]{0,14}$/;
export function validScopeId(value){const id=String(value||'').trim().toLowerCase();return VALID_SCOPE.test(id)?id:'';}
export function parseFavorites(raw){
  if(raw===null||raw===undefined)return [...DEFAULT_FAVORITES];
  return [...new Set(String(raw).split(',').map(validScopeId).filter(id=>id&&id!=='admin'))];
}
export function serializeFavorites(values){
  return [...new Set((Array.isArray(values)?values:[]).map(validScopeId).filter(id=>id&&id!=='admin'))].join(',');
}
export function homeScopeForAccount(value,account,allowedScopeIds=[]){
  const id=validScopeId(value);
  if(!account?.user||id==='loc'||!id)return 'loc';
  const allowed=new Set(allowedScopeIds.map(validScopeId));
  const own=new Set(account.authorizer?.scopeIds||[]);
  return allowed.has(id)&&(account.canManageGlobalSync?.()||own.has(id))?id:'loc';
}
