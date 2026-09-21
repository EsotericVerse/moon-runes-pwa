'use client';

import { useEffect, useState } from 'react';
import {CULTURE_PATHS_V2} from '../migration-bridges/current-data-compat.v2';
import {fetchLocStaticJson} from './data';
import {selectScopeProjectionRows} from './neon-scope-projections';
import { useNeonAccount } from './use-neon-account';
import ThemeAdmin from './ThemeAdmin';
import {SCOPE_POLICY_V2,getScopeV2} from '../modular-v2/scope-registry.v2';
import {useScopeRuntimeV2} from '../modular-v2/use-scope-runtime.v2';

export default function GovernanceManagement(){
  const account=useNeonAccount();
  const {scopeId}=useScopeRuntimeV2();
  const scope=getScopeV2(scopeId);
  const [shared,setShared]=useState({loading:false,eras:[],daily:[],events:[],relations:[],error:''});

  const loadShared=async()=>{
    setShared(current=>({...current,loading:true,error:''}));
    try{
      const eraPath=CULTURE_PATHS_V2.eraByScope[scopeId];
      const [eraValue,contextRows]=await Promise.all([
        eraPath?fetchLocStaticJson(eraPath):Promise.resolve({}),
        scope?.dataViews?.context?selectScopeProjectionRows(scopeId,'context'):Promise.resolve([])
      ]);
      const eras=eraValue?.eras||[];
      const events=contextRows.filter(row=>['事件','情境事件'].includes(row.context_type));
      const relations=contextRows.filter(row=>['關聯','跨資料關聯','符文關聯'].includes(row.context_type)||row.source&&row.target);
      setShared({
        loading:false,
        eras,
        daily:[],
        events,
        relations,
        error:''
      });
    }catch(error){
      setShared(current=>({...current,loading:false,error:String(error?.message||error)}));
    }
  };

  useEffect(()=>{
    if(!account.loading&&!account.permissionLoading&&account.user&&account.canManage)loadShared();
    else setShared({loading:false,eras:[],daily:[],events:[],relations:[],error:''});
  },[account.loading,account.permissionLoading,account.user?.id,account.canManage,scopeId]);

  return <section className="loc-card" id="management">
    <p className="loc-eyebrow">Governance Management</p>
    <h2>治理管理</h2>
    <p className="loc-subtitle">目前 Scope：{scope.label}（{scopeId}）。管理 session 與資料讀寫都必須遵守 Scope 邊界；公開 Current projection 維持唯讀。</p>
    {(account.loading||account.permissionLoading)&&<p>正在確認 Neon session 與管理權限…</p>}
    {!account.loading&&!account.user&&<button type="button" onClick={account.signIn}>使用 Google 登入 Neon</button>}
    {!account.loading&&!account.permissionLoading&&account.user&&!account.canManage&&<p>此 Neon 身份沒有 Scope manager 或 page manager 權限。</p>}
    {!account.loading&&!account.permissionLoading&&account.user&&account.canManage&&<>
      <p><strong>Neon session 有效。</strong> {account.user.email||account.user.name||''}</p>
      <hr/>
      <h3>Neon 共享資料狀態</h3>
      {shared.loading&&<p>正在讀取 Neon Data API…</p>}
      {!shared.loading&&!shared.error&&<>
        <ul>
          <li>ERA：{shared.eras.length}</li>
          <li>每日符文：目前由 Scope 專用資料流程提供</li>
          <li>Context 事件：{shared.events.length}</li>
          <li>Context 關係：{shared.relations.length}</li>
        </ul>
        <button type="button" onClick={loadShared}>重新讀取 Neon</button>
      </>}
      {shared.error&&<p role="alert">Neon 讀取失敗：{shared.error}</p>}
      <hr/>
      <button type="button" onClick={account.signOut}>登出 Neon</button>
    </>}
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
    {account.user&&account.canManage?<ThemeAdmin/>:<p>需要 Scope manager 或 page manager 權限。</p>}
  </section>;
}
