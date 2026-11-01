'use client';
import {useEffect,useState} from 'react';
import {useUiText} from '../i18n/UiText';
import {mcpClerkSession} from './mcp/clerk-access.mjs';
import {scopeGroupRequest} from './mcp/scope-group-client.mjs';
import {dbPublicClient} from './db-client.mjs';

const ACTIONS=['read','write','configure','manage'];
export default function ScopeGroupAccessPanel({groupId}){
  const ui=useUiText();
  const t=k=>ui('uiExtra.scopeSettings.'+k);
  const [data,setData]=useState(null);
  const [subject,setSubject]=useState('');
  const [scope,setScope]=useState('');
  const [newScope,setNewScope]=useState('');
  const [categoryUid,setCategoryUid]=useState('');
  const [selected,setSelected]=useState(['read']);
  const [days,setDays]=useState(365);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState('');
  const call=async(kind,values={})=>{
    const {token}=await mcpClerkSession();
    return scopeGroupRequest({groupid:groupId,kind,token,...values});
  };
  const reload=async()=>{
    const result=await call('list');
    setData(result);
    setScope(current=>result.members.includes(current)?current:
      (result.members.find(x=>x!==groupId)||groupId));
  };
  useEffect(()=>{
    let active=true;
    setLoading(true);setStatus('');setData(null);
    call('list').then(result=>{
      if(active){setData(result);setScope(result.members.find(x=>x!==groupId)||groupId);}
    }).catch(()=>{if(active)setStatus(t('groupLoadFailed'));})
      .finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[groupId]);
  const submit=async(kind,values,success)=>{
    if(busy)return;
    setBusy(true);setStatus('');
    try{await call(kind,values);await reload();setStatus(t(success));}
    catch(error){setStatus(error.message||t('groupSaveFailed'));}
    finally{setBusy(false);}
  };
  const toggle=action=>setSelected(previous=>previous.includes(action)?
    previous.filter(x=>x!==action):[...previous,action]);
  const updateCategory=async(kind,scopeid,classUid)=>{
    if(busy||!scopeid||!/^[A-Za-z0-9]{4}$/.test(classUid))return;
    setBusy(true);setStatus('');
    try{
      if(kind==='categoryAdd'){
        // Validate against the public Class-only directory; no Group or Item
        // and no private Class may be browsed from this Group UI.
        const {data:shared,error}=await dbPublicClient.schema('silver')
          .rpc('read_shared_keyword_classes',{p_scope_id:scopeid});
        if(error)throw new Error(error.message||'無法核對公開科目');
        if(!(Array.isArray(shared)?shared:[]).some(row=>row.classUid===classUid))
          throw new Error('僅能加入此 Scope 已公開的群組科目（四碼 Class UID）');
      }
      await call(kind,{scopeid,classUid});
      await reload();
      if(kind==='categoryAdd')setCategoryUid('');
      setStatus(kind==='categoryAdd'?'已加入關鍵字目錄。':'已移除關鍵字目錄項目。');
    }catch(error){setStatus(error.message||'無法更新關鍵字目錄');}
    finally{setBusy(false);}
  };
  return <section className="loc-card scope-feature-card" aria-label={t('groupTitle')}>
    <h2>{t('groupTitle')}</h2>
    <p className="scope-status">{t('groupIntro')}</p>
    {loading?<p role="status" className="scope-status">{t('groupLoading')}</p>:null}
    {data?<>
      <div className="scope-management-fields">
        <label><span>{t('groupMemberScope')}</span>
          <select className="scope-select" value={scope} onChange={e=>setScope(e.target.value)}>
            {data.members.map(id=><option key={id} value={id}>{id}</option>)}
          </select>
        </label>
        <label><span>{t('groupClerkSubject')}</span>
          <input value={subject} onChange={e=>setSubject(e.target.value.trim())}
            autoCapitalize="off" spellCheck={false} placeholder="user_..."/>
        </label>
        <label><span>{t('groupExpires')}</span>
          <input type="number" min={1} max={365} value={days}
            onChange={e=>setDays(Number(e.target.value))}/>
        </label>
        <fieldset className="scope-management-wide-field">
          <legend>{t('groupPermissions')}</legend>
          <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
            {ACTIONS.map(action=><label key={action} style={{display:'inline-flex',alignItems:'center',gap:6}}>
              <input type="checkbox" checked={selected.includes(action)}
                onChange={()=>toggle(action)}/>{action}
            </label>)}
          </div>
        </fieldset>
        <div className="scope-management-wide-field">
          <button type="button" className="loc-button" disabled={busy||!subject||!selected.length}
            onClick={()=>submit('grant',{scopeid:scope,subject,actions:selected,days},'groupGranted')}>
            {t('groupGrant')}
          </button>
        </div>
      </div>
      <h3>{t('groupCurrentGrants')}</h3>
      {data.grants.length===0?<p className="scope-status">{t('groupNoGrants')}</p>:
        <div className="scope-management-fields">
          {data.grants.map(grant=><div className="scope-management-wide-field" key={grant.key}
            style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
            <span><strong>{grant.scope}</strong> · {grant.subject}</span>
            <span className="scope-status">{grant.actions.join(', ')} · {new Date(grant.expires_at).toLocaleDateString()}</span>
            <button type="button" className="loc-button" disabled={busy}
              onClick={()=>{
                if(globalThis.confirm?.(t('groupConfirmRevoke')))
                  void submit('revoke',{scopeid:grant.scope,subject:grant.subject},'groupRevoked');
              }}>{t('groupRevoke')}</button>
          </div>)}
        </div>}
      <h3>關鍵字目錄（Scope Group 管理）</h3>
      <p className="scope-status">每筆記錄：Scope ID／四碼群組科目 UID／SHA。只允許已公開的 Class，不能選擇 Group 或 Item。</p>
      <div className="scope-management-fields">
        <label><span>四碼群組科目 UID</span>
          <input value={categoryUid} maxLength={4} autoCapitalize="off" spellCheck={false}
            onChange={event=>setCategoryUid(event.target.value)} placeholder="A1b2"/></label>
        <div className="scope-management-wide-field">
          <button type="button" className="loc-button"
            disabled={busy||!scope||scope===groupId||!/^[A-Za-z0-9]{4}$/.test(categoryUid)}
            onClick={()=>updateCategory('categoryAdd',scope,categoryUid)}>加入公開群組科目</button>
        </div>
      </div>
      {(data.categories||[]).length
        ?<div className="scope-management-fields">
          {data.categories.map(entry=><div className="scope-management-wide-field" key={entry.sha}
            style={{display:'flex',alignItems:'center',flexWrap:'wrap',gap:10}}>
            <span><strong>{entry.scopeid}</strong>／<code>{entry.class}</code></span>
            <span className="scope-status" title={entry.sha}>SHA：<code>{entry.sha.slice(0,12)}…</code></span>
            <button type="button" className="loc-button" disabled={busy}
              onClick={()=>updateCategory('categoryRemove',entry.scopeid,entry.class)}>移除</button>
          </div>)}
        </div>
        :<p className="scope-status">尚未建立關鍵字目錄項目。</p>}
      <h3>{t('groupLinkTitle')}</h3>
      <p className="scope-status">{t('groupLinkIntro')}</p>
      <div className="scope-management-fields">
        <label><span>{t('groupNewScope')}</span><input value={newScope}
          onChange={e=>setNewScope(e.target.value.toLowerCase().trim())}
          autoCapitalize="off" spellCheck={false}/></label>
        <button type="button" className="loc-button" disabled={busy||!newScope}
          onClick={()=>submit('join',{scopeid:newScope},'groupLinked')}>{t('groupLink')}</button>
      </div>
    </>:null}
    {status?<p className="scope-status" role="status">{status}</p>:null}
  </section>;
}
