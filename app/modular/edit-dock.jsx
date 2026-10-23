'use client';

import {createContext,useCallback,useContext,useMemo,useRef,useState} from 'react';

// UI-only editing session: it grants NO write permissions. Protected screens and
// the existing database authorization keep their independent write boundaries.
const EditDockContext=createContext(null);

export function EditDockProvider({children}){
  const [scopeId,setScopeId]=useState('');
  const [hasSave,setHasSave]=useState(false);
  const activeEditor=useRef(null);

  const begin=useCallback(id=>setScopeId(String(id||'').trim()),[]);
  const end=useCallback(()=>{
    activeEditor.current=null;
    setHasSave(false);
    setScopeId('');
  },[]);
  const register=useCallback(actions=>{
    const entry={save:actions.save,discard:actions.discard};
    activeEditor.current=entry;
    setHasSave(typeof entry.save==='function');
    return ()=>{
      if(activeEditor.current!==entry)return;
      activeEditor.current=null;
      setHasSave(false);
    };
  },[]);
  const save=useCallback(()=>activeEditor.current?.save?.(),[]);
  const discard=useCallback(()=>{
    if(!window.confirm('要放棄目前尚未儲存的編輯嗎？'))return;
    activeEditor.current?.discard?.();
    end();
  },[end]);
  const canNavigate=useCallback(()=>{
    if(!activeEditor.current)return true;
    if(!window.confirm('離開目前編輯內容？未儲存的變更將不會保留。'))return false;
    activeEditor.current=null;
    setHasSave(false);
    return true;
  },[]);
  const value=useMemo(()=>({
    active:Boolean(scopeId),scopeId,hasSave,begin,end,register,save,discard,canNavigate
  }),[scopeId,hasSave,begin,end,register,save,discard,canNavigate]);
  return <EditDockContext.Provider value={value}>{children}</EditDockContext.Provider>;
}

export function useEditDock(){return useContext(EditDockContext);}
