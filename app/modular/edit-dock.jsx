'use client';

import {createContext,useCallback,useContext,useEffect,useMemo,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {Capacitor} from '@capacitor/core';
import {dbAuthEvents} from '../loc/db-client.mjs';

// UI only: a Scope's permission is checked before entering edit mode,
// and every write still passes through its existing database authorization.
const EditDockContext=createContext(null);

export function EditDockProvider({children}){
  const router=useRouter();
  const [scopeId,setScopeId]=useState('');
  const [hasSave,setHasSave]=useState(false);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const [switchTarget,setSwitchTarget]=useState('');
  const [switchError,setSwitchError]=useState('');
  const switchDialog=useRef(null);
  const switchHistory=useRef('replace');
  const switchScroll=useRef(true);
  // A management selection changes mounted React content, not the URL route.
  const pendingSectionAction=useRef(null);
  const registeredEditors=useRef(new Set());
  const currentEditor=useRef(null);

  useEffect(()=>{
    const dialog=switchDialog.current;
    if(!dialog)return;
    if(switchTarget&&!dialog.open)dialog.showModal();
    if(!switchTarget&&dialog.open)dialog.close();
  },[switchTarget]);

  const clearEditor=useCallback(()=>{
    registeredEditors.current.clear();
    currentEditor.current=null;
    setHasSave(false);
  },[]);
  const begin=useCallback(id=>{
    const idText=String(id||'').trim();
    if(!idText)return;
    setScopeId(idText);
    setNotice('');
  },[]);
  const end=useCallback(()=>{
    clearEditor();
    setScopeId('');
    setNotice('');
  },[clearEditor]);

  // A Google OAuth account change invalidates all editor UI permissions.
  // The backend still authorizes each write using the active JWT/RLS.
  // Device-local SQLite editing is independent of cloud OAuth.
  const activeScope=useRef('');
  activeScope.current=scopeId;
  useEffect(()=>{
    let lastUserId=null;
    const subscription=dbAuthEvents.onAuthStateChange((event,session)=>{
      const userId=String(session?.user?.id||'');
      const identityChanged=lastUserId!==null&&lastUserId!==userId;
      lastUserId=userId;
      const invalidated=event==='SIGNED_OUT'||identityChanged;
      if(!invalidated)return;
      if(activeScope.current==='local'&&Capacitor.isNativePlatform())return;
      end();
    });
    return ()=>subscription.data.subscription.unsubscribe();
  },[end]);

  // Each mounted editor supplies the *current page's* save function.
  // Unmounting clears it only if no later editor has replaced it.
  const register=useCallback(actions=>{
    const editor={save:actions.save,discard:actions.discard,isDirty:actions.isDirty,isBusy:actions.isBusy};
    registeredEditors.current.add(editor);
    const activate=()=>{
      currentEditor.current=editor;
      setHasSave(typeof editor.save==='function');
      setNotice('');
    };
    // A page with multiple independent forms (Article and Suno) keeps the
    // first as default. Focusing another form explicitly replaces Save.
    if(!currentEditor.current)activate();
    const unregister=()=>{
      registeredEditors.current.delete(editor);
      if(currentEditor.current!==editor)return;
      currentEditor.current=registeredEditors.current.values().next().value||null;
      setHasSave(typeof currentEditor.current?.save==='function');
    };
    unregister.activate=activate;
    return unregister;
  },[]);

  const navigate=useCallback((target,history='replace',scroll=true)=>{
    if(!target)return;
    const url=new URL(String(target),window.location.href);
    if(url.origin!==window.location.origin||/\/index\.html$/i.test(url.pathname)){
      window.location.assign(url.href);
    }else{
      if(history==='push')router.push(url.pathname+url.search+url.hash,{scroll});
      else router.replace(url.pathname+url.search+url.hash,{scroll});
    }
  },[router]);
  const complete=useCallback(target=>{
    end();
    navigate(target);
  },[end,navigate]);
  const save=useCallback(async({stayInEditMode=false}={})=>{
    if(busy)return;
    // A management section can mount independent Database / ISR / Email
    // editors simultaneously. Save every dirty editor through the existing
    // six-feature Save action; never silently save just the first mounted one.
    const dirty=[...registeredEditors.current].filter(editor=>editor.isDirty?.());
    const editors=dirty.length?dirty:(currentEditor.current?[currentEditor.current]:[]);
    if(!editors.length||editors.some(editor=>typeof editor.save!=='function')){
      setNotice('這個頁面尚未載入可儲存的編輯內容。');
      return;
    }
    if(editors.some(editor=>editor.isBusy?.())){
      setNotice('正在儲存其他設定，請完成後再操作。');
      return;
    }
    setBusy(true);
    setNotice('');
    try{
      for(const editor of editors){
        const saved=await editor.save();
        if(saved!==true)throw new Error('部分設定未儲存，已保留編輯內容。請檢查各區塊提示。');
      }
      if(dirty.length)setNotice(stayInEditMode?'已分段儲存，可繼續編輯。':'目前修改已儲存。');
    }catch(error){
      setNotice(String(error?.message||'儲存失敗，請檢查內容。'));
    }finally{
      setBusy(false);
    }
  },[busy]);
  const dirtyEditors=useCallback(()=>[...registeredEditors.current].filter(editor=>
    typeof editor.isDirty==='function'&&editor.isDirty()
  ),[]);
  const discard=useCallback((target,{confirmOnlyWhenDirty=false}={})=>{
    if(busy)return;
    if((!confirmOnlyWhenDirty||dirtyEditors().length)&&
      !window.confirm(confirmOnlyWhenDirty
        ?'確定放棄尚未儲存的變更並返回普通頁面？'
        :'確定放棄尚未儲存的編輯並返回首頁？'))return;
    end();
    navigate(target);
  },[busy,dirtyEditors,end,navigate]);
  // Every mounted form reports its own unsaved state; a focused form is not
  // necessarily the only edited one on a management page.
  const switchTo=useCallback((target,{history='replace',scroll=true}={})=>{
    pendingSectionAction.current=null;
    if(busy||!target)return;
    if([...registeredEditors.current].some(editor=>editor.isBusy?.())){
      setNotice('目前正在儲存，請完成後再切換頁面。');
      return;
    }
    switchHistory.current=history==='push'?'push':'replace';
    switchScroll.current=scroll!==false;
    if(!dirtyEditors().length){
      clearEditor();setNotice('');navigate(target,switchHistory.current,switchScroll.current);return;
    }
    setSwitchError('');
    setSwitchTarget(target);
  },[busy,dirtyEditors,clearEditor,navigate]);
  const switchSection=useCallback((next,commit)=>{
    if(busy||typeof commit!=='function')return;
    if([...registeredEditors.current].some(editor=>editor.isBusy?.())){
      setNotice('目前正在儲存，請完成後再切換。');
      return;
    }
    const apply=()=>commit(next);
    if(!dirtyEditors().length){
      pendingSectionAction.current=null;
      clearEditor();setNotice('');
      apply();
      return;
    }
    // Reuse the existing Save/Discard/Cancel dialog, without router.push.
    pendingSectionAction.current=apply;
    setSwitchError('');
    setSwitchTarget('management-section:'+String(next));
  },[busy,dirtyEditors,clearEditor]);
  const cancelSwitch=useCallback(()=>{
    if(!busy){pendingSectionAction.current=null;setSwitchTarget('');setSwitchError('');}
  },[busy]);
  const discardAndSwitch=useCallback(()=>{
    if(busy||!switchTarget)return;
    const target=switchTarget;
    const action=pendingSectionAction.current;
    pendingSectionAction.current=null;
    setSwitchTarget('');setSwitchError('');
    clearEditor();setNotice('');
    if(action)action();
    else navigate(target,switchHistory.current,switchScroll.current);
  },[busy,switchTarget,clearEditor,navigate]);
  const saveAndSwitch=useCallback(async()=>{
    if(busy||!switchTarget)return;
    const target=switchTarget;
    const editors=dirtyEditors();
    setBusy(true);setSwitchError('');
    try{
      for(const editor of editors){
        if(typeof editor.save!=='function')throw new Error('目前編輯內容無法儲存，已取消切換。');
        // A successful save must return true; false/undefined must never
        // be interpreted as a successful write.
        const saved=await editor.save({switching:true});
        if(saved!==true)throw new Error('儲存尚未完成，已保留目前頁面與編輯內容。');
      }
      const action=pendingSectionAction.current;
      pendingSectionAction.current=null;
      setSwitchTarget('');
      clearEditor();setNotice('');
      if(action)action();
      else navigate(target,switchHistory.current,switchScroll.current);
    }catch(error){
      setSwitchError(String(error?.message||'儲存失敗，已取消切換。'));
    }finally{setBusy(false);}
  },[busy,switchTarget,dirtyEditors,clearEditor,navigate]);
  const value=useMemo(()=>({
    active:Boolean(scopeId),scopeId,hasSave,busy,notice,begin,end,
    register,save,discard,complete,switchTo,switchSection,setNotice
  }),[scopeId,hasSave,busy,notice,begin,end,register,save,discard,complete,switchTo,switchSection]);
  return <EditDockContext.Provider value={value}>
    {children}
    <dialog ref={switchDialog} className="scope-edit-switch-dialog" aria-labelledby="scope-edit-switch-title"
      aria-describedby="scope-edit-switch-description"
      onCancel={event=>{if(busy)event.preventDefault();else cancelSwitch();}}>
      <h2 id="scope-edit-switch-title">有未儲存的編輯內容</h2>
      <p id="scope-edit-switch-description">切換頁面前，要如何處理目前的變更？</p>
      {switchError?<p role="alert" className="scope-status scope-error">{switchError}</p>:null}
      <div className="scope-edit-switch-actions">
        <button type="button" className="loc-button primary" disabled={busy} onClick={saveAndSwitch}>儲存並切換</button>
        <button type="button" className="loc-button" disabled={busy} onClick={discardAndSwitch}>放棄變更</button>
        <button type="button" className="loc-button" disabled={busy} onClick={cancelSwitch}>取消</button>
      </div>
    </dialog>
  </EditDockContext.Provider>;
}

export function useEditDock(){return useContext(EditDockContext);}

// Registers a real editor with the existing Save / Discard / Cancel dock.
// Callbacks are kept current without re-registering on every keystroke.
export function useEditDockForm(actions){
  const dock=useEditDock();
  const latest=useRef(actions);
  latest.current=actions;
  useEffect(()=>{
    if(!dock?.register)return;
    return dock.register({
      save:options=>latest.current.save?.(options),
      discard:()=>latest.current.discard?.(),
      isDirty:()=>Boolean(latest.current.isDirty?.()),
      isBusy:()=>Boolean(latest.current.isBusy?.())
    });
  },[dock?.register]);
}
