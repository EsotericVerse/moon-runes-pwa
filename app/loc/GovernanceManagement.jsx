'use client';

import { useEffect, useState } from 'react';
import {
  getManagementSession,
  getNeonGovernanceStatus,
  managementAuthConfigured,
  managementHasPermission,
  managementStateRequest,
  managementStateWrite,
  signInManagementWithGoogle,
  signOutManagement
} from './auth-client';
import {
  getKvAliases,
  getKvGovernanceProjection,
  getKvStateHealth,
  kvStateConfigured
} from './kv-state';
import DualSemanticEnginePanel from './DualSemanticEnginePanel';

const EMPTY_ALIAS={alias:'',canonical:'',scope:'global',status:'current'};
const EMPTY_VISIBILITY={scope:'lo3rwang',resource_type:'work',resource_id:'',visibility:'private',projection_level:'metadata',search_indexed:false,statistics_included:false,semantic_scan_included:false};

export default function GovernanceManagement(){
  const configured=managementAuthConfigured();
  const stateConfigured=kvStateConfigured();
  const [state,setState]=useState({loading:configured,session:null,error:''});
  const [shared,setShared]=useState({loading:false,health:null,aliases:[],visibility:[],projection:null,neon:null,error:''});
  const [aliasDraft,setAliasDraft]=useState(EMPTY_ALIAS);
  const [visibilityDraft,setVisibilityDraft]=useState(EMPTY_VISIBILITY);
  const [message,setMessage]=useState('');

  const isAdmin=managementHasPermission(state.session,'platform:admin');

  const loadPlatform=async(session=state.session)=>{
    if(!session||!isSessionAdmin(session))return;
    setShared(current=>({...current,loading:true,error:''}));
    try{
      const [health,aliases,visibilityData,projection,neon]=await Promise.all([
        stateConfigured?getKvStateHealth():Promise.resolve(null),
        stateConfigured?getKvAliases():Promise.resolve([]),
        managementStateRequest('/visibility').catch(error=>({records:[],error:String(error?.message||error)})),
        stateConfigured?getKvGovernanceProjection().catch(()=>null):Promise.resolve(null),
        getNeonGovernanceStatus().catch(error=>({configured:false,error:String(error?.message||error),migration_state:'not_started'}))
      ]);
      setShared({loading:false,health,aliases,visibility:Array.isArray(visibilityData?.records)?visibilityData.records:[],projection,neon,error:visibilityData?.error||''});
    }catch(error){
      setShared(current=>({...current,loading:false,error:String(error?.message||error)}));
    }
  };

  const isSessionAdmin=(session)=>managementHasPermission(session,'platform:admin');

  useEffect(()=>{
    if(!configured)return;
    let alive=true;
    getManagementSession().then(session=>{
      if(!alive)return;
      setState({loading:false,session,error:''});
      if(session&&isSessionAdmin(session))loadPlatform(session);
    }).catch(error=>{if(alive)setState({loading:false,session:null,error:String(error?.message||error)});});
    return()=>{alive=false;};
  },[configured]);

  const login=async()=>{
    setState(current=>({...current,error:''}));
    try{await signInManagementWithGoogle('/admin');}
    catch(error){setState(current=>({...current,error:String(error?.message||error)}));}
  };

  const logout=async()=>{
    try{
      await signOutManagement();
      setState({loading:false,session:null,error:''});
      setShared({loading:false,health:null,aliases:[],visibility:[],projection:null,neon:null,error:''});
    }catch(error){setState(current=>({...current,error:String(error?.message||error)}));}
  };

  const saveAlias=async(event)=>{
    event.preventDefault();setMessage('');
    try{
      await managementStateWrite('/aliases',{body:{alias_record:aliasDraft}});
      setAliasDraft(EMPTY_ALIAS);setMessage('Alias 已更新。');await loadPlatform();
    }catch(error){setMessage(`Alias 更新失敗：${String(error?.message||error)}`);}
  };

  const removeAlias=async(alias)=>{
    try{await managementStateWrite('/aliases',{body:{action:'delete',alias}});setMessage(`已移除 alias：${alias}`);await loadPlatform();}
    catch(error){setMessage(`Alias 移除失敗：${String(error?.message||error)}`);}
  };

  const saveVisibility=async(event)=>{
    event.preventDefault();setMessage('');
    try{
      await managementStateWrite('/visibility',{body:{record:visibilityDraft}});
      setVisibilityDraft(EMPTY_VISIBILITY);setMessage('Visibility 已更新；公開 projection 尚未自動重建。');await loadPlatform();
    }catch(error){setMessage(`Visibility 更新失敗：${String(error?.message||error)}`);}
  };

  const editVisibility=(row)=>setVisibilityDraft({...EMPTY_VISIBILITY,...row});
  const removeVisibility=async(row)=>{
    try{await managementStateWrite('/visibility',{body:{action:'delete',record:row}});setMessage('Visibility 記錄已移除。');await loadPlatform();}
    catch(error){setMessage(`Visibility 移除失敗：${String(error?.message||error)}`);}
  };

  const rebuildProjection=async()=>{
    setMessage('');
    try{
      const data=await managementStateWrite('/projection-rebuild',{body:{reason:'manual_admin_rebuild'}});
      setShared(current=>({...current,projection:data?.projection||null}));
      setMessage('Public governance projection 已重建。Private / internal 資源不會進公開 projection。');
    }catch(error){setMessage(`Projection rebuild 失敗：${String(error?.message||error)}`);}
  };

  if(!configured)return <section className="loc-card"><h2>平台管理</h2><p role="alert">尚未設定 NEXT_PUBLIC_LOC_AUTH_URL。</p></section>;

  return <div className="loc-stack">
    <section className="loc-card" id="management">
      <p className="loc-eyebrow">Platform Admin</p><h2>平台治理管理</h2>
      <p>Next.js 負責管理 UI 與共用 library；真正的寫入授權由 Auth Worker / State Worker 在 server-side 執行。<strong>Frozen Rune Canon 永久唯讀，Admin 也不能 bypass。</strong></p>
      {state.loading&&<p>正在確認管理 session…</p>}
      {!state.loading&&!state.session&&<button type="button" onClick={login}>使用 Google 驗證管理權限</button>}
      {state.session&&!isAdmin&&<><p role="alert">此帳號是 Scope Editor，不是 Platform Admin。請從各 Scope 的 Governance 頁管理被授權的資料。</p><button type="button" onClick={logout}>登出</button></>}
      {isAdmin&&<>
        <p><strong>Platform Admin session 有效。</strong> {state.session?.user?.email||''}</p>
        <p>Permissions：{(state.session.permissions||[]).join('、')}</p>
        {shared.loading&&<p>正在讀取平台治理狀態…</p>}
        {shared.health&&<p>State Worker：{shared.health.ok?'正常':'異常'}｜Projection：{shared.health.projection_built_at||'尚未建立'}</p>}
      </>}
      {state.error&&<p role="alert">{state.error}</p>}
    </section>

    {isAdmin&&<>
      <section className="loc-card" id="alias-management">
        <p className="loc-eyebrow">Routes</p><h3>Alias / Canonical Route</h3>
        <p>平台級 <code>platform:routes:write</code>。例如 <code>whoami → lo3rwang</code> 只需在這裡治理一次。</p>
        {shared.aliases.length>0&&<ul>{shared.aliases.map(item=><li key={item.alias}><code>{item.alias}</code> → <code>{item.canonical}</code>（{item.scope} / {item.status}） <button type="button" onClick={()=>setAliasDraft(item)}>編輯</button> <button type="button" onClick={()=>removeAlias(item.alias)}>移除</button></li>)}</ul>}
        <form onSubmit={saveAlias}>
          <p><label>Alias <input required value={aliasDraft.alias} onChange={e=>setAliasDraft(v=>({...v,alias:e.target.value}))}/></label></p>
          <p><label>Canonical <input required value={aliasDraft.canonical} onChange={e=>setAliasDraft(v=>({...v,canonical:e.target.value}))}/></label></p>
          <p><label>Scope <input value={aliasDraft.scope} onChange={e=>setAliasDraft(v=>({...v,scope:e.target.value}))}/></label></p>
          <p><label>Status <select value={aliasDraft.status} onChange={e=>setAliasDraft(v=>({...v,status:e.target.value}))}><option value="current">current</option><option value="legacy">legacy</option><option value="deprecated">deprecated</option><option value="historical">historical</option></select></label></p>
          <button type="submit">儲存 Alias</button>
        </form>
      </section>

      <section className="loc-card" id="visibility-management">
        <p className="loc-eyebrow">Rights / Projection</p><h3>Visibility 與公開層級</h3>
        <p><strong>作者全文預設 private。</strong> Visibility 與 projection level 分開治理；只有 public 記錄會進公開 projection。</p>
        {shared.visibility.length>0&&<ul>{shared.visibility.map(row=><li key={`${row.scope}|${row.resource_type}|${row.resource_id}`}><code>{row.scope}/{row.resource_type}/{row.resource_id}</code>｜{row.visibility} / {row.projection_level} <button type="button" onClick={()=>editVisibility(row)}>編輯</button> <button type="button" onClick={()=>removeVisibility(row)}>移除</button></li>)}</ul>}
        <form onSubmit={saveVisibility}>
          <p><label>Scope <input required value={visibilityDraft.scope} onChange={e=>setVisibilityDraft(v=>({...v,scope:e.target.value}))}/></label></p>
          <p><label>Resource type <input required value={visibilityDraft.resource_type} onChange={e=>setVisibilityDraft(v=>({...v,resource_type:e.target.value}))}/></label></p>
          <p><label>Resource ID <input required value={visibilityDraft.resource_id} onChange={e=>setVisibilityDraft(v=>({...v,resource_id:e.target.value}))}/></label></p>
          <p><label>Visibility <select value={visibilityDraft.visibility} onChange={e=>setVisibilityDraft(v=>({...v,visibility:e.target.value}))}><option value="private">private</option><option value="internal">internal</option><option value="public">public</option></select></label></p>
          <p><label>Projection <select value={visibilityDraft.projection_level} onChange={e=>setVisibilityDraft(v=>({...v,projection_level:e.target.value}))}><option value="metadata">metadata</option><option value="summary">summary</option><option value="full">full</option></select></label></p>
          <p><label><input type="checkbox" checked={visibilityDraft.search_indexed} onChange={e=>setVisibilityDraft(v=>({...v,search_indexed:e.target.checked}))}/> 搜尋</label> <label><input type="checkbox" checked={visibilityDraft.statistics_included} onChange={e=>setVisibilityDraft(v=>({...v,statistics_included:e.target.checked}))}/> 統計</label> <label><input type="checkbox" checked={visibilityDraft.semantic_scan_included} onChange={e=>setVisibilityDraft(v=>({...v,semantic_scan_included:e.target.checked}))}/> 語意掃描</label></p>
          <button type="submit">儲存 Visibility</button>
        </form>
      </section>

      <section className="loc-card" id="projection-management">
        <p className="loc-eyebrow">Projection</p><h3>Public Projection Rebuild</h3>
        <p>公開應用只讀治理後 projection，不直接讀 private source corpus。</p>
        <button type="button" onClick={rebuildProjection}>重建 Public Projection</button>
        {shared.projection&&<p>Built：{shared.projection.built_at}｜Public resources：{shared.projection.counts?.public_resources??shared.projection.resources?.length??0}</p>}
      </section>

      <section className="loc-card" id="neon-governance">
        <p className="loc-eyebrow">Neon Adapter</p><h3>Neon Governance 接口</h3>
        <p>管理層接口已準備，但這一輪<strong>不做資料移轉</strong>。</p>
        <p>Configured：{shared.neon?.configured?'yes':'no'}｜Reachable：{shared.neon?.reachable?'yes':'no'}｜Migration：{shared.neon?.migration_state||'not_started'}</p>
        {shared.neon?.project_id&&<p>Project：<code>{shared.neon.project_id}</code></p>}
        {shared.neon?.error&&<p role="alert">{shared.neon.error}</p>}
      </section>

      <DualSemanticEnginePanel session={state.session}/>
      {message&&<p role="status" className="loc-card">{message}</p>}
      {shared.error&&<p role="alert" className="loc-card">{shared.error}</p>}
      <section className="loc-card"><button type="button" onClick={()=>loadPlatform()}>重新讀取治理狀態</button> <button type="button" onClick={logout}>登出管理</button></section>
    </>}
  </div>;
}
