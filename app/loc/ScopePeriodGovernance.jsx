'use client';

import { useEffect, useState } from 'react';
import { getManagementSession, managementHasPermission, managementStateWrite, signInManagementWithGoogle } from './auth-client';
import { getKvEras, kvStateConfigured } from './kv-state';

const EMPTY_ERA={period:'',name:'',display_label:'',start_date:'',end_date:'',status:'released'};

export default function ScopePeriodGovernance({scope='lo3rwang'}){
  const [eras,setEras]=useState([]);
  const [session,setSession]=useState(null);
  const [draft,setDraft]=useState(EMPTY_ERA);
  const [message,setMessage]=useState('');
  const configured=kvStateConfigured();
  const canWrite=managementHasPermission(session,'scope:period:write');

  const load=async()=>{
    if(!configured) return;
    try{
      const [rows,currentSession]=await Promise.all([getKvEras(),getManagementSession().catch(()=>null)]);
      setEras(rows);
      setSession(currentSession);
    }catch(error){
      setMessage(String(error?.message||error));
    }
  };

  useEffect(()=>{load();},[]);

  const save=async(event)=>{
    event.preventDefault();
    setMessage('');
    try{
      await managementStateWrite('/eras',{method:'POST',body:{era:{...draft,scope}}});
      setDraft(EMPTY_ERA);
      setMessage('時期已更新。');
      await load();
    }catch(error){
      setMessage(`時期更新失敗：${String(error?.message||error)}`);
    }
  };

  const remove=async(period)=>{
    setMessage('');
    try{
      await managementStateWrite('/eras',{method:'POST',body:{action:'delete',period}});
      setMessage(`已移除時期：${period}`);
      await load();
    }catch(error){
      setMessage(`時期移除失敗：${String(error?.message||error)}`);
    }
  };

  return <section className="loc-card" id="period-governance">
    <p className="loc-eyebrow">Scope Governance · Period</p>
    <h2>個人時期治理</h2>
    <p>Period／ERA 屬於 {scope} Scope 的日常治理，不需要進 Platform Admin。公開訪客可讀；修改仍需 <code>scope:period:write</code> 的伺服器端授權。</p>
    {!configured && <p role="alert">尚未設定 NEXT_PUBLIC_LOC_STATE_URL。</p>}
    {eras.length>0 && <ul>{eras.map(era=><li key={era.period}>
      <strong>{era.display_label||era.name||era.period}</strong> <code>{era.period}</code>
      {era.start_date ? ` · ${era.start_date}` : ''}{era.end_date ? ` → ${era.end_date}` : ''}
      {canWrite && <> <button type="button" onClick={()=>setDraft({...EMPTY_ERA,...era,end_date:era.end_date||''})}>編輯</button> <button type="button" onClick={()=>remove(era.period)}>移除</button></>}
    </li>)}</ul>}
    {!session && <button type="button" onClick={()=>signInManagementWithGoogle('/lo3rwang/governance#period-governance')}>治理者登入</button>}
    {canWrite && <form onSubmit={save}>
      <p><label>Period ID <input required value={draft.period} onChange={event=>setDraft(current=>({...current,period:event.target.value}))}/></label></p>
      <p><label>Name <input value={draft.name} onChange={event=>setDraft(current=>({...current,name:event.target.value}))}/></label></p>
      <p><label>Display label <input value={draft.display_label} onChange={event=>setDraft(current=>({...current,display_label:event.target.value}))}/></label></p>
      <p><label>Start <input type="date" value={draft.start_date} onChange={event=>setDraft(current=>({...current,start_date:event.target.value}))}/></label></p>
      <p><label>End <input type="date" value={draft.end_date||''} onChange={event=>setDraft(current=>({...current,end_date:event.target.value}))}/></label></p>
      <p><label>Status <select value={draft.status} onChange={event=>setDraft(current=>({...current,status:event.target.value}))}>
        <option value="released">released</option>
        <option value="current">current</option>
        <option value="historical">historical</option>
        <option value="draft">draft</option>
      </select></label></p>
      <button type="submit">儲存時期</button>{' '}
      <button type="button" onClick={()=>setDraft(EMPTY_ERA)}>清除</button>
    </form>}
    {message && <p role="status">{message}</p>}
  </section>;
}
