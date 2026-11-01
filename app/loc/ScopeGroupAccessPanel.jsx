'use client';
import {useEffect,useState} from 'react';
import {useUiText} from '../i18n/UiText';
import {mcpClerkSession} from './mcp/clerk-access.mjs';
import {scopeGroupRequest} from './mcp/scope-group-client.mjs';

const ACTIONS=['read','write','configure','manage'];
export default function ScopeGroupAccessPanel({groupId}){
  const ui=useUiText();
  const t=k=>ui('uiExtra.scopeSettings.'+k);
  const [data,setData]=useState(null);
  const [subject,setSubject]=useState('');
  const [scope,setScope]=useState('');
  const [newScope,setNewScope]=useState('');
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
