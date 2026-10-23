'use client';

import {createContext,useCallback,useContext,useMemo,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';

// UI only: a Scope's permission is checked before entering edit mode,
// and every write still passes through its existing database authorization.
const EditDockContext=createContext(null);

export function EditDockProvider({children}){
  const router=useRouter();
  const [scopeId,setScopeId]=useState('');
  const [hasSave,setHasSave]=useState(false);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const currentEditor=useRef(null);

  const clearEditor=useCallback(()=>{
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

  // Each mounted editor supplies the *current page's* save function.
  // Unmounting clears it only if no later editor has replaced it.
  const register=useCallback(actions=>{
    const editor={save:actions.save,discard:actions.discard};
    const activate=()=>{
      currentEditor.current=editor;
      setHasSave(typeof editor.save==='function');
      setNotice('');
    };
    // A page with multiple independent forms (Article and Suno) keeps the
    // first as default. Focusing another form explicitly replaces Save.
    if(!currentEditor.current)activate();
    const unregister=()=>{
      if(currentEditor.current!==editor)return;
      clearEditor();
    };
    unregister.activate=activate;
    return unregister;
  },[clearEditor]);

  const navigate=useCallback(target=>{
    if(!target)return;
    const url=new URL(String(target),window.location.href);
    if(url.origin!==window.location.origin||/\/index\.html$/i.test(url.pathname)){
      window.location.assign(url.href);
    }else{
      router.replace(url.pathname+url.search+url.hash);
    }
  },[router]);
  const complete=useCallback(target=>{
    end();
    navigate(target);
  },[end,navigate]);
  const save=useCallback(async()=>{
    if(busy)return;
    const editor=currentEditor.current;
    if(typeof editor?.save!=='function'){
      setNotice('這個頁面尚未載入可儲存的編輯內容。');
      return;
    }
    setBusy(true);
    setNotice('');
    try{
      await editor.save();
    }catch(error){
      setNotice(String(error?.message||'儲存失敗，請檢查內容。'));
    }finally{
      setBusy(false);
    }
  },[busy]);
  const discard=useCallback(target=>{
    if(busy)return;
    if(!window.confirm('確定放棄尚未儲存的編輯並返回首頁？'))return;
    end();
    navigate(target);
  },[busy,end,navigate]);
  // Shortcut navigation is explicit. Uncommitted drafts do not write.
  // The next page registers its own save, replacing the previous action.
  const switchTo=useCallback(target=>{
    if(busy)return;
    clearEditor();
    setNotice('');
    navigate(target);
  },[busy,clearEditor,navigate]);
  const value=useMemo(()=>({
    active:Boolean(scopeId),scopeId,hasSave,busy,notice,begin,end,
    register,save,discard,complete,switchTo,setNotice
  }),[scopeId,hasSave,busy,notice,begin,end,register,save,discard,complete,switchTo]);
  return <EditDockContext.Provider value={value}>{children}</EditDockContext.Provider>;
}

export function useEditDock(){return useContext(EditDockContext);}
