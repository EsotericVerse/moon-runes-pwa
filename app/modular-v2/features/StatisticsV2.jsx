'use client';

import {useEffect,useState} from 'react';
import {selectScopeRankingPage,selectScopeRankingTypes} from '../../loc/neon-scope-projections';
import FeaturePageV2 from '../FeaturePageV2';
import {ScopeCardV2} from '../PageShellV2';
import {scopeDataViewV2} from '../scope-registry.v2';
import {useScopeRuntimeV2} from '../use-scope-runtime.v2';

const PAGE_SIZE=20;

const LEGACY_SECTIONS=Object.freeze({
  keyword:{eyebrow:'Keyword Statistics',title:'關鍵字統計',text:'集中查看關鍵字在跨時期資料中的出現與分布，作為風格分析與資料回查入口。'},
  source:{eyebrow:'Source Management',title:'來源管理',text:'檢視目前 Scope 的 Neon 統計 projection 與資料狀態。'},
  import:{eyebrow:'Import',title:'匯入',text:'匯入網頁暫時保留功能位置；目前先維持既有資料流程，後續再接入新的資料來源。'},
  total:{eyebrow:'Total Ranking',title:'總排行榜',text:'跨時期關鍵字排行榜集中於此，可切換文字、社群與音樂資料的統計類型。'}
});

export default function StatisticsV2({section=null}){
  const {scopeId,scope}=useScopeRuntimeV2();
  const view=scopeDataViewV2(scopeId,'rankings');
  const [rows,setRows]=useState([]);const [total,setTotal]=useState(0);const [types,setTypes]=useState([]);
  const [type,setType]=useState('');
  const [page,setPage]=useState(1);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);

  useEffect(()=>{
    setRows([]);setTotal(0);setTypes([]);setType('');setPage(1);setError('');
  },[scopeId,view]);

  useEffect(()=>{
    let live=true;
    if(!view)return()=>{live=false};
    setLoading(true);
    Promise.all([selectScopeRankingPage(scopeId,{page,pageSize:PAGE_SIZE,rankingType:type}),selectScopeRankingTypes(scopeId)])
      .then(([result,availableTypes])=>{
        if(live){setRows(result.rows);setTotal(result.count);setTypes(availableTypes);}
      })
      .catch(error=>{
        if(live)setError(String(error?.message||error||'Ranking read failed'));
      })
      .finally(()=>live&&setLoading(false));
    return()=>{live=false};
  },[view,scopeId,page,type]);

  useEffect(()=>{if(types.length&&!types.includes(type))setType(types[0]);},[types,type]);
  const pages=Math.max(1,Math.ceil(total/PAGE_SIZE));
  const shown=rows;
  const legacy=LEGACY_SECTIONS[section?.split('/')[0]];
  const rankingPath=!section||section==='total'||section==='keyword/total'||section==='music/total'||section==='source/total'?'/statics':null;
  return <FeaturePageV2 featureId="statics" expandedPath={rankingPath} subtitle="直接讀取各 Scope 的 Neon 統計 projection，呈現關鍵字排行榜與資料分佈。">
    {legacy?<ScopeCardV2 eyebrow={legacy.eyebrow} title={legacy.title}><p>{legacy.text}</p></ScopeCardV2>:null}
    <ScopeCardV2 eyebrow="Statistics" title="跨時期關鍵字排行榜集中於此。">
      <p>統計排行榜、關鍵字、曲風與來源的分佈，作為風格分析與資料回查的入口。</p>
    </ScopeCardV2>
    {!view?<p className="scope-v2-status">此 Scope 尚未啟用統計 projection。</p>:null}
    {error?<p className="scope-v2-status scope-v2-error">{error}</p>:null}
    {loading?<p className="scope-v2-status">載入中…</p>:null}
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
    {total?<div className="scope-v2-pagination">
      <span>第 {page} / {pages} 頁 · 共 {total} 筆</span>
      <div>
        <button type="button" disabled={page<=1} onClick={()=>setPage(value=>Math.max(1,value-1))}>上一頁</button>
        <button type="button" disabled={page>=pages} onClick={()=>setPage(value=>Math.min(pages,value+1))}>下一頁</button>
      </div>
    </div>:null}
  </FeaturePageV2>;
}
