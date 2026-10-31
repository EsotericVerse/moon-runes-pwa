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
import {grantHomeEditorAccess} from './home-edit-access.mjs';
import {clearEditorSession} from './edit-session-ttl.mjs';

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
        clearEditorSession(window.sessionStorage);
        grantHomeEditorAccess(window.sessionStorage,'local','local-device');
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
      // A new verified edit entry starts a fresh 30-minute idle / 2-hour
      // edit session; otherwise a previously locked session can never reopen.
      clearEditorSession(window.sessionStorage);
      grantHomeEditorAccess(window.sessionStorage,scopeId,result.user.id);
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
