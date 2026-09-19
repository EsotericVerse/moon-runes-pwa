'use client';

import {useEffect,useMemo,useState} from 'react';
import {neonClient} from '../../loc/neon-client';
import {fetchLocJson,LOC_DATA} from '../../loc/data';
import FeaturePageV2 from '../FeaturePageV2';
import {ScopeCardV2} from '../PageShellV2';
import {scopeDataViewV2} from '../scope-registry.v2';
import {useScopeRuntimeV2} from '../use-scope-runtime.v2';

const PAGE_SIZE=20;

export default function StatisticsV2(){
  const {scopeId,scope}=useScopeRuntimeV2();
  const view=scopeDataViewV2(scopeId,'rankings');
  const [rows,setRows]=useState([]);
  const [dailyDraws,setDailyDraws]=useState([]);
  const [type,setType]=useState('');
  const [page,setPage]=useState(1);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);

  useEffect(()=>{
    let live=true;
    setRows([]);setDailyDraws([]);setType('');setPage(1);setError('');
    if(!view)return()=>{live=false};
    setLoading(true);
    neonClient.from(view).select('*').order('rank_value',{ascending:false}).limit(1000)
      .then(({data,error})=>{
        if(error)throw new Error(error.message||'Ranking read failed');
        if(live)setRows(data||[]);
      })
      .catch(async error=>{
        try{
          const fallback=await fetchLocJson(LOC_DATA.SEARCH_SOURCE_STATS);
          const candidates=Array.isArray(fallback)?fallback:Object.values(fallback||{}).flatMap(value=>Array.isArray(value)?value:[]);
          const rows=candidates.map((row,index)=>({
            ranking_key:row.ranking_key||row.key||row.source||String(index),
            ranking_type:row.ranking_type||'資料來源',
            term:row.term||row.name||row.source||row.label||'—',
            item_count:row.item_count??row.count??row.total??'—',
            rank_value:row.rank_value??row.score??row.count??row.total??0
          }));
          if(live){setRows(rows);setError('');}
        }catch{
          if(live)setError(String(error?.message||error));
        }
      })
      .finally(()=>live&&setLoading(false));
    return()=>{live=false};
  },[view]);

  useEffect(()=>{
    let live=true;
    if(scopeId!=='runes')return()=>{live=false};
    fetchLocJson(LOC_DATA.DAILY_RUNE_REPO_HISTORY)
      .then(value=>{if(live)setDailyDraws(Array.isArray(value?.daily_draws)?[...value.daily_draws].reverse():[]);})
      .catch(()=>{if(live)setDailyDraws([]);});
    return()=>{live=false};
  },[scopeId]);

  const types=useMemo(()=>[...new Set(rows.map(row=>row.ranking_type).filter(Boolean))],[rows]);
  useEffect(()=>{if(types.length&&!types.includes(type))setType(types[0]);},[types,type]);
  const filtered=useMemo(()=>rows.filter(row=>!type||row.ranking_type===type),[rows,type]);
  const pages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
  const shown=filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);

  return <FeaturePageV2 featureId="statics" subtitle={`${scope.label} Scope 的排行榜與統計；資料由該 Scope 的 Neon projection 提供。`}>
    {!view?<p className="scope-v2-status">此 Scope 尚未啟用統計 projection。</p>:null}
    {error?<p className="scope-v2-status scope-v2-error">{error}</p>:null}
    {loading?<p className="scope-v2-status">載入中…</p>:null}
    {scopeId==='runes'&&dailyDraws.length?<ScopeCardV2 eyebrow="抽籤紀錄" title="每日符文紀錄">
      <div className="scope-v2-ranking">
        {dailyDraws.slice(0,10).map(row=><div key={row.id||row.date}>
          <b>{row.date} · {row.rune}</b>
          <span>{row.direction||'—'}</span>
        </div>)}
      </div>
      <p className="scope-v2-status">顯示已確認的每日抽籤紀錄；完整紀錄依日期保留。</p>
    </ScopeCardV2>:null}
    {types.length?<nav className="scope-v2-tabs" aria-label="排行榜類型">
      {types.map(item=><button type="button" key={item} aria-pressed={item===type} onClick={()=>{setType(item);setPage(1)}}>{item}</button>)}
    </nav>:null}
    <ScopeCardV2 eyebrow={scope.label} title={scope.rankingTitle||'排行榜'}>
      <div className="scope-v2-ranking">
        {shown.map((row,index)=><div key={row.ranking_key||`${row.term}-${index}`}>
          <b>{(page-1)*PAGE_SIZE+index+1}. {row.term}</b>
          <span>{row.item_count??'—'} · {row.rank_value??'—'}</span>
        </div>)}
      </div>
      {!loading&&!error&&!shown.length?<p>目前沒有可顯示的統計資料。</p>:null}
    </ScopeCardV2>
    {filtered.length?<div className="scope-v2-pagination">
      <span>第 {page} / {pages} 頁 · 共 {filtered.length} 筆</span>
      <div>
        <button type="button" disabled={page<=1} onClick={()=>setPage(value=>Math.max(1,value-1))}>上一頁</button>
        <button type="button" disabled={page>=pages} onClick={()=>setPage(value=>Math.min(pages,value+1))}>下一頁</button>
      </div>
    </div>:null}
  </FeaturePageV2>;
}
