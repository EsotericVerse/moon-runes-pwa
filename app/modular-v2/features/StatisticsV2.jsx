'use client';

import {useEffect,useMemo,useState} from 'react';
import {neonClient} from '../../loc/neon-client';
import {Bar,BarChart,CartesianGrid,Line,LineChart,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import FeaturePageV2 from '../FeaturePageV2';
import {ScopeCardV2} from '../PageShellV2';
import {scopeDataViewV2} from '../scope-registry.v2';
import {useScopeRuntimeV2} from '../use-scope-runtime.v2';

const PAGE_SIZE=20;
const text=value=>String(value??'');
function normalize(row,index){
  const payload=row?.payload&&typeof row.payload==='object'?row.payload:{};
  const value={...row,...payload};
  return {...value,id:value.id||value.entry_key||value.ranking_key||'stat-'+index,date:text(value.date||value.start_date).slice(0,10),kind:value.kind||value.entry_type||value.culture_type||'trajectory',title:value.title||value.name||value.term||value.label||'未命名',body:value.body||value.content||value.description||value.summary||'',eraId:value.era_id||value.period_id||value.period||'',source:value.source||value.source_name||value.media_type||''};
}
function groupByDate(rows){
  const grouped=new Map();
  for(const row of rows){const key=row.date||'未指定';const current=grouped.get(key)||{date:key,total:0,works:0,events:0,trajectories:0,recommendations:0,sources:0};current.total+=1;if(row.kind==='work')current.works+=1;if(row.kind==='event')current.events+=1;if(row.kind==='trajectory')current.trajectories+=1;if(row.kind==='recommendation')current.recommendations+=1;grouped.set(key,current);}
  return [...grouped.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
function groupByEra(rows){
  const grouped=new Map();
  for(const row of rows){const key=row.eraId||'未分期';const current=grouped.get(key)||{era:key,total:0,works:0,events:0,trajectories:0};current.total+=1;if(row.kind==='work'||row.kind==='recommendation')current.works+=1;if(row.kind==='event')current.events+=1;if(row.kind==='trajectory')current.trajectories+=1;grouped.set(key,current);}
  return [...grouped.values()];
}
export default function StatisticsV2({section=null}){
  const {scopeId,scope}=useScopeRuntimeV2();
  const cultureView=scopeDataViewV2(scopeId,'culture');
  const rankingView=scopeDataViewV2(scopeId,'rankings');
  const [cultureRows,setCultureRows]=useState([]);
  const [rankingRows,setRankingRows]=useState([]);
  const [mode,setMode]=useState(section==='keyword'?'keywords':'units');
  const [rankingType,setRankingType]=useState('');
  const [page,setPage]=useState(1);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');

  useEffect(()=>{
    let live=true;
    setLoading(true);setError('');
    Promise.all([
      cultureView?neonClient.from(cultureView).select('*').order('date',{ascending:true}).limit(5000):Promise.resolve({data:[],error:null}),
      rankingView?neonClient.from(rankingView).select('*').order('rank_value',{ascending:false}).limit(1000):Promise.resolve({data:[],error:null})
    ]).then(([culture,rankings])=>{
      if(culture?.error)throw new Error(culture.error.message||'Culture SQL projection 讀取失敗');
      if(rankings?.error)throw new Error(rankings.error.message||'Ranking SQL projection 讀取失敗');
      if(live){setCultureRows((culture?.data||[]).map(normalize));setRankingRows(rankings?.data||[]);}
    }).catch(errorValue=>live&&setError(String(errorValue?.message||errorValue)))
      .finally(()=>live&&setLoading(false));
    return()=>{live=false};
  },[cultureView,rankingView]);

  const days=useMemo(()=>groupByDate(cultureRows),[cultureRows]);
  const eras=useMemo(()=>groupByEra(cultureRows),[cultureRows]);
  const sources=useMemo(()=>{const map=new Map();for(const row of cultureRows){const key=row.source||'未標記來源';map.set(key,(map.get(key)||0)+1);}return [...map.entries()].map(([source,total])=>({source,total})).sort((a,b)=>b.total-a.total);},[cultureRows]);
  const rankingTypes=useMemo(()=>[...new Set(rankingRows.map(row=>row.ranking_type).filter(Boolean))],[rankingRows]);
  useEffect(()=>{if(rankingTypes.length&&!rankingTypes.includes(rankingType))setRankingType(rankingTypes[0]);},[rankingTypes,rankingType]);
  const rankings=useMemo(()=>rankingRows.filter(row=>!rankingType||row.ranking_type===rankingType),[rankingRows,rankingType]);
  const pages=Math.max(1,Math.ceil(rankings.length/PAGE_SIZE));
  const shown=rankings.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);
  const chartData=mode==='units'?days.slice(-120):mode==='eras'?eras:mode==='sources'?sources:days.slice(-120);

  return <FeaturePageV2 featureId="statics" subtitle="從時間長河計算單位、密度、來源與排行榜，回饋下一輪脈絡整理。">
    <ScopeCardV2 eyebrow="Statistics · Time River" title="時間長河統計">
      <p>統計只做單位表達：某日、某時期、某來源有多少內容；軌跡文字仍留在 Culture 長河，不被數字取代。</p>
      <div className="scope-v2-tabs" aria-label="統計模式">
        {[['units','每日內容'],['eras','時期分布'],['sources','來源密度'],['keywords','關鍵字排行榜']].map(([key,label])=><button type="button" key={key} aria-pressed={mode===key} onClick={()=>{setMode(key);setPage(1)}}>{label}</button>)}
      </div>
      {loading?<p className="scope-v2-status">載入 SQL projection…</p>:null}
      {error?<p className="scope-v2-status scope-v2-error">{error}</p>:null}
      {mode!=='keywords'?<div className="statistics-chart"><ResponsiveContainer width="100%" height={340}><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="var(--loc-line)"/><XAxis dataKey={mode==='eras'?'era':mode==='sources'?'source':'date'} tick={{fill:'currentColor',fontSize:11}}/><YAxis allowDecimals={false} tick={{fill:'currentColor',fontSize:11}}/><Tooltip/><Bar dataKey="total" fill="var(--loc-accent)" radius={[6,6,0,0]}/>{mode==='units'?<><Bar dataKey="works" fill="var(--loc-gold)" radius={[6,6,0,0]}/><Bar dataKey="events" fill="var(--loc-muted)" radius={[6,6,0,0]}/></>:null}</BarChart></ResponsiveContainer></div>:null}
      {mode==='keywords'?<div className="statistics-ranking"><div className="scope-v2-tabs" aria-label="排行榜類型">{rankingTypes.map(item=><button type="button" key={item} aria-pressed={rankingType===item} onClick={()=>{setRankingType(item);setPage(1)}}>{item}</button>)}</div><div className="scope-v2-ranking">{shown.map((row,index)=><div key={row.ranking_key||row.term||index}><b>{(page-1)*PAGE_SIZE+index+1}. {row.term||row.title||row.name||'—'}</b><span>{row.item_count??'—'} · {row.rank_value??'—'}</span></div>)}</div>{!loading&&!shown.length?<p>目前沒有可顯示的排行榜資料。</p>:null}{rankings.length?<div className="scope-v2-pagination"><span>第 {page} / {pages} 頁 · 共 {rankings.length} 筆</span><div><button type="button" disabled={page<=1} onClick={()=>setPage(value=>Math.max(1,value-1))}>上一頁</button><button type="button" disabled={page>=pages} onClick={()=>setPage(value=>Math.min(pages,value+1))}>下一頁</button></div></div>:null}</div>:null}
    </ScopeCardV2>
    <div className="statistics-summary"><span>{cultureRows.length} 筆時間內容</span><span>{eras.length} 個時期</span><span>{days.length} 個日期</span><span>{sources.length} 種來源</span><span>排行榜 {rankings.length} 筆</span></div>
    <ScopeCardV2 eyebrow="Next Context Loop" title="統計 → 脈絡">
      <p>統計只提供線索；下一步回到脈絡界定關鍵字、補充來源與關係，再回到時間長河重新分析。</p>
      <p><a href="/context">回到脈絡關鍵字界定</a></p>
    </ScopeCardV2>
  </FeaturePageV2>;
}
