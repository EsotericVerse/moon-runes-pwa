'use client';

import {useEffect,useState} from 'react';
import {neonClient} from '../../loc/neon-client';
import FeaturePageV2 from '../FeaturePageV2';
import {ScopeCardV2} from '../PageShellV2';
import {scopeDataViewV2} from '../scope-registry.v2';
import {useScopeRuntimeV2} from '../use-scope-runtime.v2';

const PAGE_SIZE=20;

export default function ContextV2(){
  const {scopeId,scope}=useScopeRuntimeV2();
  const view=scopeDataViewV2(scopeId,'context');
  const [rows,setRows]=useState([]);
  const [page,setPage]=useState(1);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);

  useEffect(()=>{
    let live=true;
    setRows([]);setPage(1);setError('');
    if(!view)return()=>{live=false};
    setLoading(true);
    neonClient.from(view).select('*').order('updated_at',{ascending:false}).limit(1000)
      .then(({data,error})=>{
        if(!live)return;
        if(error)throw new Error(error.message||'Context read failed');
        setRows(data||[]);
      })
      .catch(e=>live&&setError(String(e?.message||e)))
      .finally(()=>live&&setLoading(false));
    return()=>{live=false};
  },[view]);

  const pages=Math.max(1,Math.ceil(rows.length/PAGE_SIZE));
  const shown=rows.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);

  return <FeaturePageV2 featureId="context" subtitle={`${scope.label} Scope 的脈絡資料；同一功能模組依 domain 自動切換資料來源。`}>
    {!view?<p className="scope-v2-status">此 Scope 尚未啟用脈絡 projection。</p>:null}
    {error?<p className="scope-v2-status scope-v2-error">{error}</p>:null}
    {loading?<p className="scope-v2-status">載入中…</p>:null}
    <div className="scope-v2-list">
      {shown.map(row=><ScopeCardV2 key={row.context_key||row.id||JSON.stringify(row)}>
        <div className="scope-v2-meta"><span>{row.scope_id||scope.id}</span>{row.context_type?<span>{row.context_type}</span>:null}</div>
        <h2>{row.title||row.context_key||'Untitled'}</h2>
        {row.summary?<p>{row.summary}</p>:null}
      </ScopeCardV2>)}
    </div>
    {rows.length?<div className="scope-v2-pagination">
      <span>第 {page} / {pages} 頁 · 共 {rows.length} 筆</span>
      <div>
        <button type="button" disabled={page<=1} onClick={()=>setPage(value=>Math.max(1,value-1))}>上一頁</button>
        <button type="button" disabled={page>=pages} onClick={()=>setPage(value=>Math.min(pages,value+1))}>下一頁</button>
      </div>
    </div>:null}
  </FeaturePageV2>;
}
