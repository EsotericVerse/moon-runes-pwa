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
