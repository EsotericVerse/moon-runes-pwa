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

// Per-device setting only: never a cloud Scope and never sent to user_settings.
export const MOBILE_HOME_ID='myphone';
export const MOBILE_FAVORITE_STORAGE_KEY='loc-device-myphone-favorite-v1';
export const MOBILE_HOME_STORAGE_KEY='loc-device-home-v1';
export function mobileFavoriteEnabled(storage){
  try{return storage?.getItem(MOBILE_FAVORITE_STORAGE_KEY)!=='false';}
  catch{return true;}
}
export function mobileHomepageChoice(storage){
  try{
    const saved=storage?.getItem(MOBILE_HOME_STORAGE_KEY);
    return typeof saved==='string'&&/^[a-z0-9_-]{1,64}$/i.test(saved)?saved:'loc';
  }catch{return 'loc';}
}
export function mobileHomepageEnabled(storage){
  return mobileHomepageChoice(storage)===MOBILE_HOME_ID;
}
export function mobileHomeHref(native){return native?'/my-phone/index.html':'/';}
export function isMobileHome(id){return String(id)===MOBILE_HOME_ID;}

/** One reusable navigation object with account and local-device capability boundaries. */
export const NavigationPreferences=Object.freeze({
  account:Object.freeze({HOME_SETTING_KEY,FAVORITES_SETTING_KEY,DEFAULT_FAVORITES,
    validScopeId,parseFavorites,serializeFavorites,homeScopeForAccount}),
  device:Object.freeze({MOBILE_HOME_ID,MOBILE_FAVORITE_STORAGE_KEY,MOBILE_HOME_STORAGE_KEY,
    mobileFavoriteEnabled,mobileHomepageChoice,mobileHomepageEnabled,mobileHomeHref,isMobileHome})
});
