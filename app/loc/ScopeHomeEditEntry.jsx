'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {useScopeRuntime} from '../modular/use-scope-runtime';
import {useEditDock} from '../modular/edit-dock';
import {useAccount} from './use-account';

// This control is shown only at the bottom of an individual Scope homepage.
// No identity or management query runs until the visitor selects it.
export default function ScopeHomeEditEntry(){
  const {scopeId}=useScopeRuntime();
  const router=useRouter();
  const account=useAccount({enabled:false});
  const editDock=useEditDock();
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');

  async function enter(){
    if(busy)return;
    setBusy(true);
    setMessage('');
    try{
      const result=await account.refresh();
      if(!result?.user){
        setMessage('請先登入，才能進入編輯模式。');
        return;
      }
      if(!result.authorizer?.canManageScopeSync(scopeId)){
        setMessage('目前帳號沒有此 Scope 的編輯權限。');
        return;
      }
      const pathname=window.location.pathname;
      const query=new URLSearchParams(window.location.search);
      // Preserve scopeid on the generic Scope shell. Never switch ownership.
      if(pathname?.startsWith('/scope-shell'))query.set('scopeid',scopeId);
      query.set('edit','1');
      editDock?.begin(scopeId);
      // Capacitor serves a static index.html. Navigating that file again would
      // reload the app and discard the authorized in-memory editing session.
      if(!/\/index\.html$/i.test(pathname))router.push(pathname+'?'+query.toString());
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
