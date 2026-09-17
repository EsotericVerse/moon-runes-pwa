'use client';

import { useEffect, useMemo, useState } from 'react';
import { getKvEras } from './kv-state';
import {
  getManagementSession,
  managementAuthConfigured,
  managementHasPermission,
  managementStateWrite,
  signInManagementWithGoogle
} from './auth-client';

const EMPTY_ERA={period:'',name:'',display_label:'',start_date:'',end_date:'',status:'released'};

export default function ScopePeriodEditor({scope}){
  const configured=managementAuthConfigured();
  const [session,setSession]=useState(null);
  const [eras,setEras]=useState([]);
  const [draft,setDraft]=useState(EMPTY_ERA);
  const [status,setStatus]=useState({loading:true,message:'',error:''});

  const load=async()=>{
    setStatus(current=>({...current,loading:true,error:''}));
    try{
      const [nextSession,nextEras]=await Promise.all([
        configured?getManagementSession():Promise.resolve(null),
        getKvEras()
      ]);
      setSession(nextSession);
      setEras(nextEras);
      setStatus({loading:false,message:'',error:''});
    }catch(error){
      setStatus({loading:false,message:'',error:String(error?.message||error)});
    }
  };

  useEffect(()=>{load();},[configured,scope]);

  const scoped=useMemo(()=>eras.filter(row=>String(row?.scope||'')===String(scope||'')),[eras,scope]);
  const unscoped=useMemo(()=>eras.filter(row=>!String(row?.scope||'').trim()),[eras]);
  const canWrite=managementHasPermission(session,'scope:period:write');

  const login=async()=>{
    try{await signInManagementWithGoogle(typeof window==='undefined'?'/':window.location.pathname);}
    catch(error){setStatus(current=>({...current,error:String(error?.message||error)}));}
  };

  const save=async(event)=>{
    event.preventDefault();
    if(!canWrite)return;
    setStatus(current=>({...current,message:'',error:''}));
    try{
      await managementStateWrite('/eras',{method:'POST',body:{era:{...draft,scope}}});
      setDraft(EMPTY_ERA);
      setStatus({loading:false,message:'時期資料已更新。',error:''});
      await load();
    }catch(error){setStatus({loading:false,message:'',error:String(error?.message||error)});}
  };

  const edit=(row)=>setDraft({
    period:String(row.period||''),
    name:String(row.name||''),
    display_label:String(row.display_label||''),
    start_date:String(row.start_date||''),
    end_date:String(row.end_date||''),
    status:String(row.status||'released')
  });

  const remove=async(row)=>{
    if(!canWrite)return;
    try{
      await managementStateWrite('/eras',{method:'POST',body:{action:'delete',scope,period:row.period}});
      setStatus({loading:false,message:`已移除 ${row.period}。`,error:''});
      await load();
    }catch(error){setStatus({loading:false,message:'',error:String(error?.message||error)});}
  };

  return <section className="loc-card" id={`${scope}-period-governance`}>
    <p className="loc-eyebrow">Scoped Governance</p>
    <h2>時期／ERA 治理</h2>
    <p>這裡只治理 <code>{scope}</code> Scope 的時期資料。平台 Admin 不需要代替各 Scope 處理日常 ERA；寫入仍由 server-side <code>scope:period:write</code> 驗權。</p>
    {status.loading && <p>正在讀取時期資料…</p>}
    {!status.loading && <>
      {scoped.length?<ul>{scoped.map(row=><li key={`${row.scope}|${row.period}`}>
        <strong>{row.display_label||row.name||row.period}</strong> <code>{row.period}</code> {row.start_date||'—'} → {row.end_date||'Current'}
        {canWrite && <> <button type="button" onClick={()=>edit(row)}>編輯</button> <button type="button" onClick={()=>remove(row)}>移除</button></>}
      </li>)}</ul>:<p>此 Scope 尚無已標記的 ERA 資料。</p>}
      {unscoped.length>0 && <p><strong>Legacy 提醒：</strong>目前另有 {unscoped.length} 筆舊 ERA 尚未標記 Scope；資料移轉前不自動歸屬，避免錯分。</p>}
      {!session && configured && <button type="button" onClick={login}>登入治理權限</button>}
      {session && !canWrite && <p>目前帳號可讀，但沒有 <code>scope:period:write</code>。</p>}
      {canWrite && <form onSubmit={save}>
        <p><label>Period ID <input required value={draft.period} onChange={event=>setDraft(current=>({...current,period:event.target.value}))}/></label></p>
        <p><label>名稱 <input value={draft.name} onChange={event=>setDraft(current=>({...current,name:event.target.value}))}/></label></p>
        <p><label>顯示名稱 <input value={draft.display_label} onChange={event=>setDraft(current=>({...current,display_label:event.target.value}))}/></label></p>
        <p><label>開始 <input type="date" value={draft.start_date} onChange={event=>setDraft(current=>({...current,start_date:event.target.value}))}/></label></p>
        <p><label>結束 <input type="date" value={draft.end_date} onChange={event=>setDraft(current=>({...current,end_date:event.target.value}))}/></label></p>
        <p><label>狀態 <select value={draft.status} onChange={event=>setDraft(current=>({...current,status:event.target.value}))}><option value="released">released</option><option value="current">current</option><option value="historical">historical</option><option value="draft">draft</option></select></label></p>
        <button type="submit">儲存 {scope} ERA</button>
      </form>}
    </>}
    {status.message && <p role="status">{status.message}</p>}
    {status.error && <p role="alert">{status.error}</p>}
  </section>;
}
