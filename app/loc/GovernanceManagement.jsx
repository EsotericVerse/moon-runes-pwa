'use client';

import { useEffect, useState } from 'react';
import {ADMIN_DATA_PATHS_V2} from '../migration-bridges/current-data-compat.v2';
import { fetchLocJsonBatch } from './data';
import { useNeonAccount } from './use-neon-account';
import ThemeAdmin from './ThemeAdmin';
import {SCOPE_POLICY_V2} from '../modular-v2/scope-registry.v2';

export default function GovernanceManagement(){
  const account=useNeonAccount();
  const [shared,setShared]=useState({loading:false,eras:[],daily:[],events:[],relations:[],error:''});

  const loadShared=async()=>{
    setShared(current=>({...current,loading:true,error:''}));
    try{
      const [eras,daily,events,relations]=await fetchLocJsonBatch([
        ADMIN_DATA_PATHS_V2.eras,
        ADMIN_DATA_PATHS_V2.dailyRunes,
        ADMIN_DATA_PATHS_V2.contextEvents,
        ADMIN_DATA_PATHS_V2.contextRelations
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
    if(account.user)loadShared();
    else setShared({loading:false,eras:[],daily:[],events:[],relations:[],error:''});
  },[account.user?.id]);

  return <section className="loc-card" id="management">
    <p className="loc-eyebrow">Governance Management</p>
    <h2>治理管理</h2>
    <p className="loc-subtitle">管理登入、個人資料與共享 Current 資料都統一使用 Neon；公開 Current projection 維持唯讀。</p>
    {account.loading&&<p>正在確認 Neon session…</p>}
    {!account.loading&&!account.user&&<button type="button" onClick={account.signIn}>使用 Google 登入 Neon</button>}
    {!account.loading&&account.user&&account.canManage&&<>
      <p><strong>Neon session 有效。</strong> {account.user.email||account.user.name||''}</p>
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
      <button type="button" onClick={account.signOut}>登出 Neon</button>
    </>}
    {!account.loading&&account.user&&!account.canManage&&<p className="loc-subtitle">此 OAuth 身份目前只有公開唯讀資格。</p>}
    {account.error&&<p role="alert">{account.error}</p>}
    <hr/>
    <h3>Scope 預設治理</h3>
    <p>目前先由 Current Registry 提供預設值；之後可由管理頁面改成可編輯設定。</p>
    <ul>
      <li>Scope ID 規則：<code>{SCOPE_POLICY_V2.scopeIdPattern}</code></li>
      <li>Scope ID 例外：{SCOPE_POLICY_V2.scopeIdExceptions.map(item=><code key={item}>{item}</code>)}</li>
      <li>預設 Scope：<code>{SCOPE_POLICY_V2.defaultScopeId}</code></li>
      <li>本部署保留字：{SCOPE_POLICY_V2.reservedWords.map(item=><code key={item.word}>{item.word}</code>)}</li>
    </ul>
    <p className="loc-subtitle">保留字只約束目前部署，不限制其他使用者、部門或其他部署使用相同名稱。</p>
    <hr/>
    <h3>全站風格管理</h3>
    <ThemeAdmin/>
  </section>;
}
