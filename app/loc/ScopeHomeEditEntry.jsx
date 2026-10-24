'use client';

import {useEffect,useState} from 'react';
import {useScopeRuntime} from '../modular/use-scope-runtime';
import {useEditDock} from '../modular/edit-dock';
import {useAccount} from './use-account';
import {Capacitor} from '@capacitor/core';

// This control is shown only at the bottom of an individual Scope homepage.
// No identity or management query runs until the visitor selects it.
export default function ScopeHomeEditEntry(){
  const {scopeId}=useScopeRuntime();
  const account=useAccount({enabled:false});
  const editDock=useEditDock();
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');

  useEffect(()=>{
    if(scopeId!=='local'||!Capacitor.isNativePlatform()||Capacitor.getPlatform()!=='ios')return;
    if(new URLSearchParams(window.location.search).get('edit')==='1')editDock?.begin('local');
  },[scopeId,editDock?.begin]);

  async function enter(){
    if(busy)return;
    setBusy(true);
    setMessage('');
    try{
      // Native device-local edits never require a cloud login; only the
      // local SQLite adapter may receive writes for this hidden Scope.
      if(scopeId==='local'&&Capacitor.isNativePlatform()&&Capacitor.getPlatform()==='ios'){
        editDock?.begin('local');
        return;
      }
      const result=await account.refresh();
      if(!result?.user){
        setMessage('請先登入，才能進入編輯模式。');
        return;
      }
      const allowed=scopeId==='loc'
        ?result.authorizer?.canManageGlobalSync()
        :result.authorizer?.canManageScopeSync(scopeId);
      if(!allowed){
        setMessage('目前帳號沒有編輯權限。');
        return;
      }
      // The homepage editor is mounted on this same Scope homepage.
      // Only switch its authorized UI state; never navigate to a new URL.
      // This also preserves the dynamic Scope shell's existing scopeid query.
      editDock?.begin(scopeId);
    }catch(error){
      setMessage(String(error?.message||'無法確認編輯權限。'));
    }finally{
      setBusy(false);
    }
  }

  if(editDock?.active&&editDock.scopeId===scopeId)return null;
  return <div className="scope-home-edit-entry">
    <button type="button" className="loc-button" disabled={busy}
      onClick={enter}>{busy?'正在確認權限…':'進入編輯模式'}</button>
    {message?<p className="scope-status" role="status">{message}</p>:null}
  </div>;
}
