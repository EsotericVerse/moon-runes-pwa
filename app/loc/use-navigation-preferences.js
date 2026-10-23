'use client';

import {useEffect,useState} from 'react';
import {usePassiveSessionAccount} from './use-account';
import {getSetting} from './user-storage';
import {NavigationPreferences} from '../modular/navigation-preferences';
const accountNavigation=NavigationPreferences.account;


const INITIAL={home:'loc',favorites:[...accountNavigation.DEFAULT_FAVORITES],folders:[],loading:true,error:''};
export function useNavigationPreferences(){
  const account=usePassiveSessionAccount();
  const [preferences,setPreferences]=useState(INITIAL);
  const identity=account.user?.id||account.user?.email||'';
  useEffect(()=>{
    if(account.loading||account.permissionLoading)return;
    if(!identity){setPreferences({...INITIAL,loading:false});return;}
    let live=true;
    setPreferences(current=>({...current,loading:true,error:''}));
    Promise.all([getSetting(accountNavigation.HOME_SETTING_KEY),getSetting(accountNavigation.FAVORITES_SETTING_KEY),getSetting(accountNavigation.folders.FOLDERS_SETTING_KEY)])
      .then(([home,favorites,folders])=>{if(live)setPreferences({
        home:accountNavigation.validScopeId(home)||'loc',favorites:accountNavigation.parseFavorites(favorites),folders:accountNavigation.folders.parseFavoriteFolders(folders),loading:false,error:''
      });})
      .catch(error=>{if(live)setPreferences({...INITIAL,loading:false,error:String(error?.message||error)});});
    return()=>{live=false;};
  },[identity,account.loading,account.permissionLoading]);
  useEffect(()=>{
    const update=event=>setPreferences(current=>({
      ...current,...event.detail,
      favorites:Object.hasOwn(event.detail||{},'favorites')?accountNavigation.parseFavorites(event.detail.favorites):current.favorites,
      folders:Object.hasOwn(event.detail||{},'folders')?accountNavigation.folders.parseFavoriteFolders(event.detail.folders):current.folders
    }));
    window.addEventListener('loc-navigation-changed',update);
    return()=>window.removeEventListener('loc-navigation-changed',update);
  },[]);
  return {...preferences,account};
}
