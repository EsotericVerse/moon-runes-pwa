// Per-device setting only: never a cloud Scope and never sent to user_settings.
export const MOBILE_HOME_ID='myphone';
export const MOBILE_FAVORITE_STORAGE_KEY='loc-device-myphone-favorite-v1';
export const MOBILE_HOME_STORAGE_KEY='loc-device-home-v1';
export function mobileFavoriteEnabled(storage){
  try{return storage?.getItem(MOBILE_FAVORITE_STORAGE_KEY)!=='false';}
  catch{return true;}
}
export function mobileHomepageEnabled(storage){
  try{return storage?.getItem(MOBILE_HOME_STORAGE_KEY)===MOBILE_HOME_ID;}
  catch{return false;}
}
export function mobileHomeHref(native){return native?'/my-phone/index.html':'/';}
export function isMobileHome(id){return String(id)===MOBILE_HOME_ID;}
