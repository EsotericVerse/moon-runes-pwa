'use client';

import {useEffect,useMemo,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Bar,BarChart,CartesianGrid,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import {selectScopeRankingPage} from '../../loc/neon-ranking-client';
import FeaturePageV2 from '../FeaturePageV2';
import {ScopeCardV2} from '../PageShellV2';
import {scopeDataViewV2} from '../scope-registry.v2';
import {useScopeRuntimeV2} from '../use-scope-runtime.v2';

const PAGE_SIZE=20;
const EMPTY_TYPES=Object.freeze([]);

const LEGACY_SECTIONS=Object.freeze({
  keyword:{eyebrow:'Keyword Statistics',title:'關鍵字統計',text:'集中查看關鍵字在跨時期資料中的出現與分布，作為風格分析與資料回查入口。'},
  source:{eyebrow:'Source Management',title:'來源管理',text:'檢視目前 Scope 的 Neon 來源與資料狀態。'},
  import:{eyebrow:'Import',title:'匯入',text:'匯入網頁暫時保留功能位置；目前先維持既有資料流程，後續再接入新的資料來源。'},
  total:{eyebrow:'Total Ranking',title:'總排行榜',text:'跨時期關鍵字排行榜集中於此，可切換文字、社群與音樂資料的統計類型。'}
});

export default function StatisticsV2({section=null}){
  const {scopeId,scope}=useScopeRuntimeV2();
  const rankingsEnabled=true;
  const [type,setType]=useState('');
  const [page,setPage]=useState(1);

  useEffect(()=>{
    setType('');
    setPage(1);
  },[scopeId,rankingsEnabled]);

  const rankingQuery=useQuery({
    queryKey:['scope-ranking-page',scopeId,page,type],
    queryFn:()=>selectScopeRankingPage(scopeId,{page,pageSize:PAGE_SIZE,rankingType:type}),
    enabled:rankingsEnabled,
    staleTime:30_000
  });
  const rows=rankingQuery.data?.rows||[];
  const total=rankingQuery.data?.count||0;
  const types=rankingQuery.data?.types||EMPTY_TYPES;
  useEffect(()=>{
    if(types.length&&!types.includes(type)){
      setType(types[0]);
      setPage(1);
    }
  },[types,type]);
  const chartRows=useMemo(()=>rows.slice(0,10).map(row=>({
    ...row,
    chartValue:Number(row.rank_value??row.item_count??0)||0
  })),[rows]);
  const pages=Math.max(1,Math.ceil(total/PAGE_SIZE));
  const legacy=LEGACY_SECTIONS[section?.split('/')[0]];
  const rankingPath=!section||section==='total'||section==='keyword/total'||section==='music/total'||section==='source/total'?'/statics':null;
  const error=rankingQuery.error?.message||'';
  const loading=rankingQuery.isPending;
  return <FeaturePageV2 featureId="statics" expandedPath={rankingPath} subtitle="由 Next server 即時查詢 Neon canonical tables，依連結 ID 與統計納入設定彙總。">
    {legacy?<ScopeCardV2 eyebrow={legacy.eyebrow} title={legacy.title}><p>{legacy.text}</p></ScopeCardV2>:null}
    <ScopeCardV2 eyebrow="Statistics" title="跨時期關鍵字排行榜集中於此。">
      <p>統計排行榜、關鍵字、曲風與來源的分佈，作為風格分析與資料回查的入口。</p>
    </ScopeCardV2>
    {!rankingsEnabled?<p className="scope-v2-status">此 Scope 尚未啟用統計功能。</p>:null}
    {error?<p className="scope-v2-status scope-v2-error">{error}</p>:null}
    {loading?<p className="scope-v2-status">載入中…</p>:null}
    {types.length?<nav className="scope-v2-tabs" aria-label="排行榜類型">
      {types.map(item=><button type="button" key={item} aria-pressed={item===type} onClick={()=>{setType(item);setPage(1)}}>{item}</button>)}
    </nav>:null}
    {chartRows.length?<ScopeCardV2 eyebrow="Recharts · 本頁前十項" title="排行分布">
      <div className="scope-v2-ranking-chart">
        <ResponsiveContainer width="100%" height={Math.max(250,chartRows.length*38)}>
          <BarChart data={chartRows} layout="vertical" margin={{top:8,right:16,bottom:8,left:8}}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={{fontSize:12}} />
            <YAxis type="category" dataKey="term" width={112} tick={{fontSize:12}} />
            <Tooltip formatter={(value)=>[value,'排行值']} />
            <Bar dataKey="chartValue" name="排行值" fill="#7562cf" radius={[0,4,4,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ScopeCardV2>:null}
    <ScopeCardV2 eyebrow={scope.label} title={scope.rankingTitle||'排行榜'}>
      <div className="scope-v2-ranking">
        {rows.map((row,index)=><div key={row.ranking_key||`${row.term}-${index}`}>
          <b>{(page-1)*PAGE_SIZE+index+1}. {row.term}</b>
          <span>{row.item_count??'—'} · {row.rank_value??'—'}</span>
        </div>)}
      </div>
      {!loading&&!error&&!rows.length?<p>目前沒有可顯示的統計資料。</p>:null}
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
