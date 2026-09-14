'use client';

import { useEffect, useState } from 'react';
import {
  getManagementSession,
  managementAuthConfigured,
  signInManagementWithGoogle,
  signOutManagement
} from './auth-client';

export default function GovernanceManagement(){
  const configured = managementAuthConfigured();
  const [state,setState] = useState({ loading: configured, session: null, error: '' });

  useEffect(()=>{
    if(!configured) return;
    let alive = true;
    getManagementSession()
      .then(session=>{ if(alive) setState({ loading:false, session, error:'' }); })
      .catch(error=>{ if(alive) setState({ loading:false, session:null, error:String(error?.message || error) }); });
    return ()=>{ alive=false; };
  },[configured]);

  const login = async()=>{
    setState(current=>({ ...current, error:'' }));
    try{
      await signInManagementWithGoogle('/management');
    }catch(error){
      setState(current=>({ ...current, error:String(error?.message || error) }));
    }
  };

  const logout = async()=>{
    setState(current=>({ ...current, error:'' }));
    try{
      await signOutManagement();
      setState({ loading:false, session:null, error:'' });
    }catch(error){
      setState(current=>({ ...current, error:String(error?.message || error) }));
    }
  };

  if(!configured){
    return <section className="loc-card" id="management">
      <p className="loc-eyebrow">Governance Management</p>
      <h2>治理管理</h2>
      <p className="loc-subtitle">管理驗證尚未部署</p>
    </section>;
  }

  return <section className="loc-card" id="management">
    <p className="loc-eyebrow">Governance Management</p>
    <h2>治理管理</h2>
    <p className="loc-subtitle">共享資料修改需要管理權限</p>
    {state.loading && <p>正在確認管理 session…</p>}
    {!state.loading && !state.session && <button type="button" onClick={login}>使用 Google 驗證管理權限</button>}
    {!state.loading && state.session && <>
      <p><strong>管理 session 有效。</strong></p>
      {state.session?.session_expires_at && <p>到期時間：{String(state.session.session_expires_at)}</p>}
      <button type="button" onClick={logout}>登出管理</button>
    </>}
    {state.error && <p role="alert">{state.error}</p>}
  </section>;
}
