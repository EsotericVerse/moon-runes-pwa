'use client';

import {useEffect,useState} from 'react';
import {useAccount} from './use-account';
import {getSetting} from './user-storage';
import {DEFAULT_FAVORITES,FAVORITES_SETTING_KEY,HOME_SETTING_KEY,parseFavorites,validScopeId} from '../modular/navigation-preferences.mjs';

const INITIAL={home:'loc',favorites:[...DEFAULT_FAVORITES],loading:true,error:''};
export function useNavigationPreferences(){
  const account=useAccount();
  const [preferences,setPreferences]=useState(INITIAL);
  const identity=account.user?.id||account.user?.email||'';
  useEffect(()=>{
    if(account.loading||account.permissionLoading)return;
    if(!identity){setPreferences({...INITIAL,loading:false});return;}
    let live=true;
    setPreferences(current=>({...current,loading:true,error:''}));
    Promise.all([getSetting(HOME_SETTING_KEY),getSetting(FAVORITES_SETTING_KEY)])
      .then(([home,favorites])=>{if(live)setPreferences({
        home:validScopeId(home)||'loc',favorites:parseFavorites(favorites),loading:false,error:''
      });})
      .catch(error=>{if(live)setPreferences({...INITIAL,loading:false,error:String(error?.message||error)});});
    return()=>{live=false;};
  },[identity,account.loading,account.permissionLoading]);
  useEffect(()=>{
    const update=event=>setPreferences(current=>({
      ...current,...event.detail,
      favorites:Object.hasOwn(event.detail||{},'favorites')?parseFavorites(event.detail.favorites):current.favorites
    }));
    window.addEventListener('loc-navigation-changed',update);
    return()=>window.removeEventListener('loc-navigation-changed',update);
  },[]);
  return {...preferences,account};
}
