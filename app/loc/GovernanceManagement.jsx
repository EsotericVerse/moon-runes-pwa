'use client';

import { useEffect, useState } from 'react';
import {
  getManagementSession,
  managementAuthConfigured,
  signInManagementWithGoogle,
  signOutManagement
} from './auth-client';
import { fetchLocJsonBatch, LOC_DATA } from './data';

export default function GovernanceManagement(){
  const configured=managementAuthConfigured();
  const [state,setState]=useState({loading:configured,session:null,error:''});
  const [shared,setShared]=useState({loading:false,eras:[],daily:[],events:[],relations:[],error:''});

  const loadShared=async()=>{
    setShared(current=>({...current,loading:true,error:''}));
    try{
      const [eras,daily,events,relations]=await fetchLocJsonBatch([
        LOC_DATA.LOC_ERA_REGISTRY,
        LOC_DATA.DAILY_RUNE_REPO_HISTORY||LOC_DATA.LOC8_DAILY_RUNE_REPO_HISTORY,
        LOC_DATA.LOC8_EVENT_SNAPSHOT,
        LOC_DATA.LOC_CROSS_RELATIONSHIP_REGISTRY
      ],{concurrency:2});
      setShared({
        loading:false,
        eras:Array.isArray(eras)?eras:(eras?.eras||[]),
        daily:Array.isArray(daily)?daily:(daily?.daily_draws||[]),
        events:Array.isArray(events)?events:(events?.events||[]),
        relations:Array.isArray(relations)?relations:(relations?.relations||[]),
        error:''
      });
    }catch(error){
      setShared(current=>({...current,loading:false,error:String(error?.message||error)}));
    }
  };

  useEffect(()=>{
    if(!configured)return;
    let alive=true;
    getManagementSession()
      .then(session=>{
        if(!alive)return;
        setState({loading:false,session,error:''});
        if(session)loadShared();
      })
      .catch(error=>{if(alive)setState({loading:false,session:null,error:String(error?.message||error)});});
    return()=>{alive=false;};
  },[configured]);

  const login=async()=>{
    setState(current=>({...current,error:''}));
    try{await signInManagementWithGoogle('/management');}
    catch(error){setState(current=>({...current,error:String(error?.message||error)}));}
  };

  const logout=async()=>{
    setState(current=>({...current,error:''}));
    try{
      await signOutManagement();
      setState({loading:false,session:null,error:''});
      setShared({loading:false,eras:[],daily:[],events:[],relations:[],error:''});
    }catch(error){
      setState(current=>({...current,error:String(error?.message||error)}));
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
    <p className="loc-subtitle">共享資料讀取已統一由 Neon Current projection 提供；公開頁面維持唯讀。</p>
    {state.loading&&<p>正在確認管理 session…</p>}
    {!state.loading&&!state.session&&<button type="button" onClick={login}>使用 Google 驗證管理權限</button>}
    {!state.loading&&state.session&&<>
      <p><strong>管理 session 有效。</strong></p>
      {state.session?.session_expires_at&&<p>到期時間：{String(state.session.session_expires_at)}</p>}
      <hr/>
      <h3>Neon 共享資料狀態</h3>
      {shared.loading&&<p>正在讀取 Neon Data API…</p>}
      {!shared.loading&&!shared.error&&<>
        <ul>
          <li>ERA：{shared.eras.length}</li>
          <li>每日符文：{shared.daily.length}</li>
          <li>Context 事件：{shared.events.length}</li>
          <li>Context 關係：{shared.relations.length}</li>
        </ul>
        <button type="button" onClick={loadShared}>重新讀取 Neon</button>
      </>}
      {shared.error&&<p role="alert">Neon 讀取失敗：{shared.error}</p>}
      <hr/>
      <button type="button" onClick={logout}>登出管理</button>
    </>}
    {state.error&&<p role="alert">{state.error}</p>}
  </section>;
}
