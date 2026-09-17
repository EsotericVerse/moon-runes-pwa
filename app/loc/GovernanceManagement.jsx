'use client';

import { useEffect, useState } from 'react';
import {
  getManagementSession,
  managementAuthConfigured,
  managementHasPermission,
  managementStateWrite,
  signInManagementWithGoogle,
  signOutManagement
} from './auth-client';
import {
  getKvAliases,
  getKvContext,
  getKvDailyRunes,
  getKvEras,
  getKvStateHealth,
  kvStateConfigured
} from './kv-state';

const EMPTY_ALIAS={alias:'',canonical:'',scope:'global',status:'current'};

export default function GovernanceManagement({initialSession=null}){
  const configured = managementAuthConfigured();
  const stateConfigured = kvStateConfigured();
  const [state,setState] = useState({ loading: configured && !initialSession, session: initialSession, error: '' });
  const [shared,setShared] = useState({ loading:false, health:null, aliases:[], eras:[], daily:[], events:[], relations:[], error:'' });
  const [probe,setProbe] = useState({ running:false, ok:false, message:'' });
  const [aliasDraft,setAliasDraft]=useState(EMPTY_ALIAS);
  const [aliasMessage,setAliasMessage]=useState('');

  const loadShared = async()=>{
    if(!stateConfigured) return;
    setShared(current=>({ ...current, loading:true, error:'' }));
    try{
      const [health,aliases,eras,daily,events,relations] = await Promise.all([
        getKvStateHealth(),
        getKvAliases(),
        getKvEras(),
        getKvDailyRunes(400),
        getKvContext('events'),
        getKvContext('relations')
      ]);
      setShared({ loading:false, health, aliases, eras, daily, events, relations, error:'' });
    }catch(error){
      setShared(current=>({ ...current, loading:false, error:String(error?.message || error) }));
    }
  };

  useEffect(()=>{
    if(initialSession){
      loadShared();
      return;
    }
    if(!configured) return;
    let alive = true;
    getManagementSession()
      .then(session=>{
        if(!alive) return;
        setState({ loading:false, session, error:'' });
        if(session) loadShared();
      })
      .catch(error=>{ if(alive) setState({ loading:false, session:null, error:String(error?.message || error) }); });
    return ()=>{ alive=false; };
  },[configured,initialSession]);

  const login = async()=>{
    setState(current=>({ ...current, error:'' }));
    try{
      await signInManagementWithGoogle('/admin');
    }catch(error){
      setState(current=>({ ...current, error:String(error?.message || error) }));
    }
  };

  const logout = async()=>{
    setState(current=>({ ...current, error:'' }));
    try{
      await signOutManagement();
      window.location.assign('/admin/login');
    }catch(error){
      setState(current=>({ ...current, error:String(error?.message || error) }));
    }
  };

  const verifyWriteChain = async()=>{
    setProbe({ running:true, ok:false, message:'' });
    try{
      await managementStateWrite('/context', {
        method:'POST',
        body:{ action:'delete_event', id:'__loc_management_probe__' }
      });
      setProbe({ running:false, ok:true, message:'管理寫入鏈已通過：Management → Auth Worker → State Worker。未新增或刪除實際紀錄。' });
      await loadShared();
    }catch(error){
      setProbe({ running:false, ok:false, message:`寫入鏈驗證失敗：${String(error?.message || error)}` });
    }
  };

  const saveAlias=async(event)=>{
    event.preventDefault();
    setAliasMessage('');
    if(!managementHasPermission(state.session,'platform:routes:write')){
      setAliasMessage('沒有 platform:routes:write 權限。');
      return;
    }
    try{
      await managementStateWrite('/aliases',{method:'POST',body:{alias_record:aliasDraft}});
      setAliasDraft(EMPTY_ALIAS);
      setAliasMessage('Alias 已更新。');
      await loadShared();
    }catch(error){
      setAliasMessage(`Alias 更新失敗：${String(error?.message||error)}`);
    }
  };

  const removeAlias=async(alias)=>{
    setAliasMessage('');
    try{
      await managementStateWrite('/aliases',{method:'POST',body:{action:'delete',alias}});
      setAliasMessage(`已移除 alias：${alias}`);
      await loadShared();
    }catch(error){
      setAliasMessage(`Alias 移除失敗：${String(error?.message||error)}`);
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
    <p className="loc-eyebrow">Platform Admin</p>
    <h2>平台治理管理</h2>
    <p className="loc-subtitle">平台級設定由 Admin 管理；公開頁面維持唯讀。</p>
    <p><strong>Frozen Rune Canon 永久唯讀。</strong>管理員也不能從此介面修改 66 符、德或其他凍結核心資料。ERA／Period 等 Scope 內低風險資料應由各自治理頁承接。</p>
    {state.loading && <p>正在確認管理 session…</p>}
    {!state.loading && !state.session && <button type="button" onClick={login}>使用 Google 驗證管理權限</button>}
    {!state.loading && state.session && <>
      <p><strong>管理 session 有效。</strong> Role：{state.session.role||'admin'}</p>
      {state.session?.session_expires_at && <p>到期時間：{String(state.session.session_expires_at)}</p>}

      <hr/>
      <h3>Route / Alias 管理</h3>
      <p>此區屬平台級 <code>platform:routes:write</code>。例如可將舊識別 <code>whoami</code> 導向 Current canonical <code>lo3rwang</code>，不需要再改多個程式檔。</p>
      {shared.aliases.length>0 && <ul>
        {shared.aliases.map(item=><li key={item.alias}>
          <code>{item.alias}</code> → <code>{item.canonical}</code>（{item.scope} / {item.status}）{' '}
          <button type="button" onClick={()=>removeAlias(item.alias)}>移除</button>
        </li>)}
      </ul>}
      <form onSubmit={saveAlias}>
        <p><label>Alias <input required value={aliasDraft.alias} onChange={event=>setAliasDraft(current=>({...current,alias:event.target.value}))}/></label></p>
        <p><label>Canonical <input required value={aliasDraft.canonical} onChange={event=>setAliasDraft(current=>({...current,canonical:event.target.value}))}/></label></p>
        <p><label>Scope <input value={aliasDraft.scope} onChange={event=>setAliasDraft(current=>({...current,scope:event.target.value}))}/></label></p>
        <p><label>Status <select value={aliasDraft.status} onChange={event=>setAliasDraft(current=>({...current,status:event.target.value}))}>
          <option value="current">current</option>
          <option value="legacy">legacy</option>
          <option value="deprecated">deprecated</option>
          <option value="historical">historical</option>
        </select></label></p>
        <button type="submit">儲存 Alias</button>
      </form>
      {aliasMessage && <p role="status">{aliasMessage}</p>}

      <hr/>
      <h3>共享 State 狀態</h3>
      {!stateConfigured && <p role="alert">尚未設定 NEXT_PUBLIC_LOC_STATE_URL。</p>}
      {stateConfigured && shared.loading && <p>正在讀取 State Worker…</p>}
      {stateConfigured && !shared.loading && !shared.error && <>
        <p><strong>State Worker：</strong>{shared.health?.ok ? '正常' : '異常'}</p>
        <ul>
          <li>Alias：{shared.aliases.length}</li>
          <li>ERA：{shared.eras.length}</li>
          <li>每日符文：{shared.daily.length}</li>
          <li>Context 事件：{shared.events.length}</li>
          <li>Context 關係：{shared.relations.length}</li>
        </ul>
        <button type="button" onClick={loadShared}>重新讀取 State</button>
      </>}
      {shared.error && <p role="alert">State 讀取失敗：{shared.error}</p>}

      <hr/>
      <h3>授權寫入鏈驗證</h3>
      <p>此驗證只對不存在的測試 ID 執行刪除請求，用來確認管理 session、Auth Worker proxy 與 State Worker 寫入授權；不新增或刪除實際紀錄。</p>
      <button type="button" onClick={verifyWriteChain} disabled={probe.running || !stateConfigured}>
        {probe.running ? '正在驗證…' : '驗證管理寫入鏈'}
      </button>
      {probe.message && <p role="status"><strong>{probe.ok ? '通過：' : ''}</strong>{probe.message}</p>}

      <hr/>
      <button type="button" onClick={logout}>登出管理</button>
    </>}
    {state.error && <p role="alert">{state.error}</p>}
  </section>;
}
