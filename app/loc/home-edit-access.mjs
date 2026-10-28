import {editorSessionStatus} from './edit-session-ttl.mjs';
// UX re-entry across full page navigations; a marker is never an authorization token.
export const HOME_EDIT_ENTRY_KEY='loc-home-edit-entry-v1';
const MAX_AGE_MS=2*60*60*1000;
export function grantHomeEditorAccess(storage,scopeId,userId,now=Date.now()){
  const id=String(scopeId||'').trim(),user=String(userId||'').trim();
  if(!/^[a-z][a-z0-9]{0,14}$/.test(id)||!user)throw new Error('Invalid home editor access');
  storage.setItem(HOME_EDIT_ENTRY_KEY,JSON.stringify({scopeId:id,userId:user,createdAt:now}));
}
export function readHomeEditorAccess(storage,now=Date.now()){
  try{
    const raw=JSON.parse(storage?.getItem(HOME_EDIT_ENTRY_KEY)||'null');
    if(!raw||!/^[a-z][a-z0-9]{0,14}$/.test(raw.scopeId)||!raw.userId||
      !Number.isFinite(raw.createdAt)||now<raw.createdAt||now-raw.createdAt>=MAX_AGE_MS||
      editorSessionStatus(storage,now).expired)return null;
    return raw;
  }catch{return null;}
}
export function clearHomeEditorAccess(storage){storage?.removeItem(HOME_EDIT_ENTRY_KEY);}
