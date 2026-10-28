'use client';

import {useState} from 'react';
import UiText from '../i18n/UiText';
import {useUiSection} from '../i18n/ui-locale';
import {registerDefaultSection} from '../i18n/ui-copy';
import editBlocksZh from '../i18n/sections/uiExtra.editBlocks.zh_tw.js';
registerDefaultSection('uiExtra.editBlocks',editBlocksZh);
import {useScopeRuntime} from '../modular/use-scope-runtime';
import {useEditDock} from '../modular/edit-dock';
import {useAccount} from './use-account';
import {Capacitor} from '@capacitor/core';

// This control is shown only at the bottom of an individual Scope homepage.
// No identity or management query runs until the visitor selects it.
export default function ScopeHomeEditEntry(){
  useUiSection('uiExtra.editBlocks');
  const {scopeId}=useScopeRuntime();
  const account=useAccount({enabled:false});
  const editDock=useEditDock();
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');


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
        setMessage('uiExtra.editBlocks.signInToEnterEditMode');
        return;
      }
      const allowed=scopeId==='loc'
        ?result.authorizer?.canManageGroupSync('loc')
        :result.authorizer?.canManageScopeSync(scopeId);
      if(!allowed){
        setMessage('uiExtra.editBlocks.editPermissionDenied');
        return;
      }
      // The homepage editor is mounted on this same Scope homepage.
      // Only switch its authorized UI state; never navigate to a new URL.
      // This also preserves the dynamic Scope shell's existing scopeid query.
      editDock?.begin(scopeId);
    }catch(error){
      setMessage(String(error?.message||'uiExtra.editBlocks.editPermissionCheckFailed'));
    }finally{
      setBusy(false);
    }
  }

  if(editDock?.active&&editDock.scopeId===scopeId)return null;
  return <div className="scope-home-edit-entry">
    <button type="button" className="loc-button" disabled={busy}
      onClick={enter}><UiText id={busy?'uiExtra.editBlocks.checkingEditPermission':'uiExtra.editBlocks.enterEditMode'}/></button>
    {message?<p className="scope-status" role="status"><UiText id={message}/></p>:null}
  </div>;
}
