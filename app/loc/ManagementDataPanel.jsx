'use client';

import {UI_COPY} from '../i18n/ui-copy';

import {useEffect,useState} from 'react';
import {neonAuthClient} from './neon-client';
import {useNeonAccount} from './use-neon-account';
import {resolveScopeTables} from './scope-table-mapping';

const PAGE_SIZE=20;

function relation(table){
  const [schema,name]=String(table).split('.');
  return neonAuthClient.schema(schema).from(name);
}
function dateText(value){return String(value||'').slice(0,10)||'—';}

export default function ManagementDataPanel({scopeId}){
  const account=useNeonAccount();
  const [kind,setKind]=useState('galaxy');
  const [visibility,setVisibility]=useState('all');
  const [page,setPage]=useState(0);
  const [rows,setRows]=useState([]);
  const [total,setTotal]=useState(0);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');

  useEffect(()=>{setPage(0);},[scopeId,kind,visibility]);

  useEffect(()=>{
    if(!scopeId||!account.canManageScopeSync(scopeId))return;
    let cancelled=false;
    (async()=>{
      setBusy(true);setError('');
      try{
        const tables=await resolveScopeTables(scopeId,{email:account.email});
        const table=kind==='media'?tables.galaxyMedia:tables.galaxy;
        let query=kind==='media'
          ?relation(table).select('media_id,title,media_type,createtime,galaxy_link',{count:'exact'})
          :relation(table).select('uid,title,source_name,createtime,UpdateTime,searchable',{count:'exact'});
        if(kind==='galaxy'&&visibility==='hidden')query=query.eq('searchable',false);
        query=query.order('createtime',{ascending:false}).range(page*PAGE_SIZE,page*PAGE_SIZE+PAGE_SIZE-1);
        const {data,count,error:queryError}=await query;
        if(queryError)throw new Error(queryError.message||'管理資料讀取失敗');
        if(cancelled)return;
        setRows(data||[]);setTotal(Number(count)||0);
      }catch(exception){
        if(!cancelled){setRows([]);setTotal(0);setError(String(exception?.message||exception||'管理資料讀取失敗'));}
      }finally{if(!cancelled)setBusy(false);}
    })();
    return()=>{cancelled=true;};
  },[scopeId,account.email,kind,visibility,page]);

  if(!account.canManageScopeSync(scopeId))return null;
  const pageCount=Math.max(1,Math.ceil(total/PAGE_SIZE));

  return <section className="loc-card scope-v2-feature-card">
    <p className="loc-eyebrow">{UI_COPY.management.data}</p>
    <h2>{UI_COPY.management.data}</h2>
    <p>管理視圖直接讀取此 Scope 的 canonical tables；不套用公開搜尋、統計或時間長河的顯示條件。</p>
    <div className="scope-v2-stat-controls">
      <label><span>{UI_COPY.management.dataType}</span><select className="scope-v2-select" value={kind} onChange={event=>setKind(event.target.value)}>
        <option value="galaxy">{UI_COPY.management.galaxyText}</option>
        <option value="media">Galaxy Media</option>
      </select></label>
      {kind==='galaxy'?<label><span>{UI_COPY.management.searchStatus}</span><select className="scope-v2-select" value={visibility} onChange={event=>setVisibility(event.target.value)}>
        <option value="all">{UI_COPY.management.allData}</option>
        <option value="hidden">{UI_COPY.management.notSearchableData}</option>
      </select></label>:null}
    </div>
    <p className="scope-v2-status">共 {total.toLocaleString()} 筆｜第 {Math.min(page+1,pageCount)} / {pageCount} 頁</p>
    {error?<p className="scope-v2-status scope-v2-error">{error}</p>:null}
    {busy?<p className="scope-v2-status">{UI_COPY.common.loading}</p>:null}
    {!busy&&!error?<div className="scope-v2-ranking">
      {rows.map(row=>{
        const id=kind==='media'?row.media_id:row.uid;
        const label=String(row.title||'').trim()||String(id||'');
        const meta=kind==='media'
          ?[row.media_type,row.galaxy_link,dateText(row.createtime)].filter(Boolean).join(' · ')
          :[row.source_name,row.searchable===false?UI_COPY.management.notSearchable:UI_COPY.management.searchable,UI_COPY.management.createdPrefix+dateText(row.createtime),UI_COPY.management.updatedPrefix+dateText(row.UpdateTime)].filter(Boolean).join(' · ');
        return <div key={String(id)}><strong>{label}</strong><span>{meta}</span></div>;
      })}
      {!rows.length?<p className="scope-v2-status">{UI_COPY.common.none}</p>:null}
    </div>:null}
    <div className="scope-v2-stat-controls">
      <button type="button" disabled={busy||page<=0} onClick={()=>setPage(value=>Math.max(0,value-1))}>{UI_COPY.management.previous}</button>
      <button type="button" disabled={busy||page+1>=pageCount} onClick={()=>setPage(value=>value+1)}>{UI_COPY.management.next}</button>
    </div>
  </section>;
}
