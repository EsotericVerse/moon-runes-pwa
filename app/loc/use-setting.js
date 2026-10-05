'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getSetting, putSetting, deleteSetting } from './user-storage';
import { useAccount } from './use-account';

export function useSetting(key,initialValue,{delay=350}={}){
  const account=useAccount();
  const [value,setValueState]=useState(initialValue);
  const [loading,setLoading]=useState(true);
  const [status,setStatus]=useState('');
  const timer=useRef(null);

  useEffect(()=>{
    let live=true;
    if(!account.user){setValueState(initialValue);setLoading(false);return()=>{live=false};}
    setLoading(true);
    getSetting(key).then(remote=>{
      if(!live)return;
      if(remote!==null&&remote!==undefined)setValueState(remote);
      setLoading(false);
    }).catch(error=>{if(live){setStatus(String(error?.message||error));setLoading(false);}});
    return()=>{live=false;if(timer.current)clearTimeout(timer.current)};
  },[account.user?.email,key]);

  const persist=useCallback(next=>{
    if(!account.user)return;
    if(timer.current)clearTimeout(timer.current);
    timer.current=setTimeout(()=>{
      putSetting(key,next).then(()=>setStatus('已同步')).catch(error=>setStatus(String(error?.message||error)));
    },delay);
  },[account.user,key,delay]);

  const setValue=useCallback(updater=>{
    setValueState(current=>{
      const next=typeof updater==='function'?updater(current):updater;
      persist(next);
      return next;
    });
  },[persist]);

  const reset=useCallback(async()=>{
    setValueState(initialValue);
    if(account.user)await deleteSetting(key);
  },[account.user,key,initialValue]);

  return {value,setValue,reset,loading,status,account};
}
