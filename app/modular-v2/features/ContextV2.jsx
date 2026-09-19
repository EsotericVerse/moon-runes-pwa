'use client';

import {useEffect,useState} from 'react';
import {neonClient} from '../../loc/neon-client';
import {fetchLocJson,fetchLocJsonBatch,LOC_DATA} from '../../loc/data';
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
        if(error)throw new Error(error.message||'Context read failed');
        if(live)setRows(data||[]);
      })
      .catch(async error=>{
        try{
          const paths=scopeId==='loc'
            ?[LOC_DATA.LOC_ERA_REGISTRY,LOC_DATA.LOC8_EVENT_SNAPSHOT]
            :[LOC_DATA.LOC_CROSS_RELATIONSHIP_REGISTRY];
          const values=await fetchLocJsonBatch(paths,{concurrency:2});
          const eraValue=values[0];
          const eventValue=scopeId==='loc'?values[1]:values[0];
          const eras=Array.isArray(eraValue?.eras)?eraValue.eras:[];
          const events=Array.isArray(eventValue?.events)?eventValue.events:[];
          const relations=scopeId==='loc'?[]:(Array.isArray(eventValue)?eventValue:(eventValue?.relations||eventValue?.relationships||eventValue?.edges||[]));
          const rows=[
            ...eras.map((row,index)=>({...row,context_key:row.era_id||`era-${index}`,context_type:'時期',title:row.display_label||row.name||row.period||'時期',summary:row.description||row.summary||''})),
            ...events.map((row,index)=>({...row,context_key:row.id||`event-${index}`,context_type:'事件',title:row.title||row.name||'事件',summary:row.description||row.summary||''})),
            ...relations
          ];
          if(live){setRows(rows);setError('');}
        }catch{
          if(live)setError(String(error?.message||error));
        }
      })
      .finally(()=>live&&setLoading(false));
    return()=>{live=false};
  },[view]);

  const pages=Math.max(1,Math.ceil(rows.length/PAGE_SIZE));
  const shown=rows.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);

  return <FeaturePageV2 featureId="context" subtitle={`${scope.label} 的脈絡：時期、事件與關係資料依 Scope 分開展示。`}>
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
