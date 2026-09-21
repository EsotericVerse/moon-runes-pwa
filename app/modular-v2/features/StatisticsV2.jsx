'use client';

import {useEffect,useMemo,useState} from 'react';
import {neonClient,readNeonOrPublicFallback} from '../../loc/neon-client';
import {Bar,BarChart,CartesianGrid,Line,LineChart,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import FeaturePageV2 from '../FeaturePageV2';
import {ScopeCardV2} from '../PageShellV2';
import {scopeDataViewV2} from '../scope-registry.v2';
import {useScopeRuntimeV2} from '../use-scope-runtime.v2';

const PAGE_SIZE=20;
const KEYWORD_GROUPS=Object.freeze(['靈魂','連結','生命','自然','礦物','元素','秩序','無序']);
const text=value=>String(value??'');
const yearOf=value=>text(value).slice(0,4);
const keywordText=value=>{
  if(value&&typeof value==='object')return text(value.term||value.keyword||value.name||value.label).trim();
  return text(value).trim();
};
function deriveKeywordRankings(rows){
  const counts=new Map();
  for(const row of rows){
    const terms=[...new Set((Array.isArray(row.keywords)?row.keywords:[]).map(keywordText).filter(Boolean))];
    for(const term of terms){
      const current=counts.get(term)||{term,item_count:0,rank_value:0,ranking_type:'year_keyword'};
      current.item_count+=1;
      current.rank_value+=1;
      counts.set(term,current);
    }
  }
  return [...counts.values()].sort((a,b)=>b.rank_value-a.rank_value||a.term.localeCompare(b.term));
}
function normalize(row,index){
  const payload=row?.payload&&typeof row.payload==='object'?row.payload:{};
  const value={...row,...payload};
  return {...value,id:value.id||value.entry_key||value.ranking_key||'stat-'+index,date:text(value.date||value.start_date).slice(0,10),kind:value.kind||value.entry_type||value.culture_type||'trajectory',title:value.title||value.name||value.term||value.label||'未命名',body:value.body||value.content||value.description||value.summary||'',eraId:value.era_id||value.period_id||value.period||'',source:value.source||value.source_name||value.media_type||'',keywords:Array.isArray(value.keywords)?value.keywords:Array.isArray(value.tags)?value.tags:[],keywordGroup:value.keyword_group||value.group||value.rune_group||''};
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
  const keywordGroupsStorageKey='loc-keyword-groups-v1:'+scopeId;
  const cultureView=scopeDataViewV2(scopeId,'culture');
  const rankingView=scopeDataViewV2(scopeId,'rankings');
  const [cultureRows,setCultureRows]=useState([]);
  const [rankingRows,setRankingRows]=useState([]);
  const [mode,setMode]=useState(section==='keyword'?'keywords':section==='eras'?'eras':section==='sources'?'sources':'units');
  const [rankingType,setRankingType]=useState('');
  const [page,setPage]=useState(1);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [rankLimit,setRankLimit]=useState(10);
  const [selectedTerms,setSelectedTerms]=useState([]);
  const [rangeMode,setRangeMode]=useState('year');
  const [selectedYear,setSelectedYear]=useState('');
  const [selectedPeriod,setSelectedPeriod]=useState('');
  const [targetKeywordGroup,setTargetKeywordGroup]=useState('連結');
  const [keywordGroups,setKeywordGroups]=useState(()=>{
    const empty=Object.fromEntries(KEYWORD_GROUPS.map(group=>[group,[]]));
    if(typeof window==='undefined')return empty;
    try{
      const stored=JSON.parse(window.localStorage.getItem(keywordGroupsStorageKey)||'null');
      return stored&&typeof stored==='object'?{...empty,...stored}:empty;
    }catch{return empty;}
  });
  useEffect(()=>{
    try{window.localStorage.setItem(keywordGroupsStorageKey,JSON.stringify(keywordGroups));}catch{}
  },[keywordGroups,keywordGroupsStorageKey]);

  useEffect(()=>{
    let live=true;
    setLoading(true);setError('');
    Promise.all([
      cultureView?readNeonOrPublicFallback(()=>neonClient.from(cultureView).select('*').order('date',{ascending:true}).limit(5000),'/projections/loc-culture.json'):Promise.resolve({data:[],error:null}),
      rankingView?readNeonOrPublicFallback(()=>neonClient.from(rankingView).select('*').order('rank_value',{ascending:false}).limit(1000),'/projections/loc-rankings.json'):Promise.resolve({data:[],error:null})
    ]).then(([culture,rankings])=>{
      if(culture?.error)throw new Error(culture.error.message||'Culture SQL projection 讀取失敗');
      if(rankings?.error)throw new Error(rankings.error.message||'Ranking SQL projection 讀取失敗');
      if(live){setCultureRows((culture?.data||[]).map(normalize));setRankingRows(rankings?.data||[]);}
    }).catch(errorValue=>live&&setError(String(errorValue?.message||errorValue)))
      .finally(()=>live&&setLoading(false));
    return()=>{live=false};
  },[cultureView,rankingView]);

  const years=useMemo(()=>[...new Set(cultureRows.map(row=>yearOf(row.date)).filter(year=>/^\d{4}$/.test(year)))].sort().reverse(),[cultureRows]);
  const periods=useMemo(()=>[...new Set(cultureRows.map(row=>row.eraId).filter(Boolean))].sort(),[cultureRows]);
  useEffect(()=>{if(!selectedYear&&years.length)setSelectedYear(years[0]);},[years,selectedYear]);
  useEffect(()=>{if(!selectedPeriod&&periods.length)setSelectedPeriod(periods[0]);},[periods,selectedPeriod]);
  const scopedCultureRows=useMemo(()=>cultureRows.filter(row=>{
    if(rangeMode==='year')return !selectedYear||yearOf(row.date)===selectedYear;
    if(rangeMode==='period')return !selectedPeriod||row.eraId===selectedPeriod;
    return true;
  }),[cultureRows,rangeMode,selectedYear,selectedPeriod]);
  const days=useMemo(()=>groupByDate(scopedCultureRows),[scopedCultureRows]);
  const eras=useMemo(()=>groupByEra(scopedCultureRows),[scopedCultureRows]);
  const sources=useMemo(()=>{const map=new Map();for(const row of scopedCultureRows){const key=row.source||'未標記來源';map.set(key,(map.get(key)||0)+1);}return [...map.entries()].map(([source,total])=>({source,total})).sort((a,b)=>b.total-a.total);},[scopedCultureRows]);
  const derivedRankings=useMemo(()=>deriveKeywordRankings(scopedCultureRows),[scopedCultureRows]);
  const scopedRankingRows=useMemo(()=>rankingRows.filter(row=>{
    if(rangeMode==='period'&&selectedPeriod)return row.period===selectedPeriod||row.era_id===selectedPeriod||row.period_id===selectedPeriod;
    if(rangeMode==='year'&&selectedYear)return yearOf(row.date||row.start_date)===selectedYear||row.year===selectedYear;
    return true;
  }),[rankingRows,rangeMode,selectedYear,selectedPeriod]);
  const rankingSource=derivedRankings.length?derivedRankings:scopedRankingRows;
  const rankingTypes=useMemo(()=>[...new Set(rankingSource.map(row=>row.ranking_type).filter(Boolean))],[rankingSource]);
  useEffect(()=>{if(rankingTypes.length&&!rankingTypes.includes(rankingType))setRankingType(rankingTypes[0]);},[rankingTypes,rankingType]);
  const rankings=useMemo(()=>rankingSource.filter(row=>!rankingType||row.ranking_type===rankingType),[rankingSource,rankingType]);
  const pages=Math.max(1,Math.ceil(rankings.length/PAGE_SIZE));
  const shown=rankings.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);
  const topTen=rankings.slice(0,10);
  const visibleTop=rankings.slice(0,rankLimit);
  const autoTerms=useMemo(()=>topTen.map(row=>row.term||row.title||row.name).filter(Boolean),[topTen]);
  useEffect(()=>{setSelectedTerms(autoTerms);},[autoTerms]);
  const termHistory=useMemo(()=>{const map=new Map();for(const row of rankingSource){const term=row.term||row.title||row.name;if(!term)continue;const current=map.get(term)||new Set();current.add(row.ranking_type||'總榜');map.set(term,current);}return map;},[rankingSource]);
  const addSelectedToGroup=()=>setKeywordGroups(current=>({...current,[targetKeywordGroup]:[...new Set([...(current[targetKeywordGroup]||[]),...selectedTerms])]}));
  const removeFromGroup=(group,term)=>setKeywordGroups(current=>({...current,[group]:(current[group]||[]).filter(item=>item!==term)}));
  const batchHref=selectedTerms.length?'/search?terms='+encodeURIComponent(selectedTerms.join('|')):'/search';
  const rangeLabel=rangeMode==='year'?(selectedYear||'年度'):rangeMode==='period'?(selectedPeriod||'時期'):'全部資料';
  const chartData=mode==='units'?days.slice(-120):mode==='eras'?eras:mode==='sources'?sources:days.slice(-120);

  return <FeaturePageV2 featureId="statics" subtitle="從時間長河計算單位、密度、來源與排行榜，回饋下一輪脈絡整理。">
    <ScopeCardV2 eyebrow="Statistics · Time River" title="時間長河統計">
      <p>統計只做單位表達：某日、某時期、某來源有多少內容；軌跡文字仍留在 Culture 長河，不被數字取代。</p>
      <div className="scope-v2-tabs statistics-mode-tabs" aria-label="統計模式">
        {[['units','每日內容'],['eras','時期分布'],['sources','來源密度'],['keywords','關鍵字排行榜']].map(([key,label])=><button type="button" key={key} aria-pressed={mode===key} onClick={()=>{setMode(key);setPage(1)}}>{label}</button>)}
      </div>
      <section className="statistics-range-panel" aria-label="統計時間範圍">
        <div className="statistics-range-heading"><p className="scope-v2-eyebrow">TIME WINDOW</p><h3>統計時間範圍</h3><span>基本單位是年，也可切換到已建立的時期。</span></div>
        <div className="statistics-range-controls">
          <label>統計基準<select value={rangeMode} onChange={event=>{setRangeMode(event.target.value);setPage(1)}}><option value="year">逐年統計</option><option value="period">時期區間</option><option value="all">全部資料</option></select></label>
          {rangeMode==='year'?<label>年份<select value={selectedYear} onChange={event=>{setSelectedYear(event.target.value);setPage(1)}}>{years.map(year=><option key={year}>{year}</option>)}</select></label>:null}
          {rangeMode==='period'?<label>時期<select value={selectedPeriod} onChange={event=>{setSelectedPeriod(event.target.value);setPage(1)}}>{periods.map(period=><option key={period}>{period}</option>)}</select></label>:null}
        </div>
        <div className="statistics-range-summary"><strong>{rangeLabel}</strong><span>{scopedCultureRows.length} 筆內容 · {days.length} 個日期 · {periods.length} 個可用時期</span></div>
      </section>
      {loading?<p className="scope-v2-status">載入展示資料…</p>:null}
      {error?<p className="scope-v2-status scope-v2-error">{error}</p>:null}
      {mode!=='keywords'?<div className="statistics-chart"><ResponsiveContainer width="100%" height={340}><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="var(--loc-line)"/><XAxis dataKey={mode==='eras'?'era':mode==='sources'?'source':'date'} tick={{fill:'currentColor',fontSize:11}}/><YAxis allowDecimals={false} tick={{fill:'currentColor',fontSize:11}}/><Tooltip/><Bar dataKey="total" fill="var(--loc-accent)" radius={[6,6,0,0]}/>{mode==='units'?<><Bar dataKey="works" fill="var(--loc-gold)" radius={[6,6,0,0]}/><Bar dataKey="events" fill="var(--loc-muted)" radius={[6,6,0,0]}/></>:null}</BarChart></ResponsiveContainer></div>:null}
      {mode==='keywords'?<div className="statistics-ranking">
        <div className="statistics-ranking-head"><div><p className="scope-v2-eyebrow">KEYWORD RANKING</p><h3>{rangeLabel}關鍵字排行榜</h3><span>依目前時間範圍統計；前 10 名會自動加入批次整理清單。</span></div><div className="scope-v2-tabs" aria-label="排行榜類型">{rankingTypes.map(item=><button type="button" key={item} aria-pressed={rankingType===item} onClick={()=>{setRankingType(item);setPage(1)}}>{item}</button>)}</div></div>
        <div className="statistics-top-ten">
          <div className="statistics-top-ten-heading"><div><p className="scope-v2-eyebrow">TOP 10 · AUTO INCLUDED</p><h3>批次整理候選</h3></div><span>{selectedTerms.length} 個關鍵詞已加入</span></div>
          <div className="scope-v2-ranking">{visibleTop.map((row,index)=>{const term=row.term||row.title||row.name||'—';const repeated=termHistory.get(term)?.size||1;return <div className="statistics-ranking-row" key={'top-'+(row.ranking_key||term||index)}><label><input type="checkbox" checked={selectedTerms.includes(term)} onChange={()=>setSelectedTerms(current=>current.includes(term)?current.filter(value=>value!==term):[...current,term])}/><b>{index+1}. {term}</b></label><span>{row.item_count??'—'} 筆 · {repeated>1?'跨 '+repeated+' 個排名':'單一排名'} · <a href={'/search?q='+encodeURIComponent(term)}>查看分佈</a></span></div>})}</div>
          <div className="statistics-batch-controls"><label>加入風格關鍵詞群組<select value={targetKeywordGroup} onChange={event=>setTargetKeywordGroup(event.target.value)}>{KEYWORD_GROUPS.map(group=><option key={group}>{group}</option>)}</select></label><button type="button" className="context-btn primary" onClick={addSelectedToGroup}>批次加入群組</button><a className="context-btn ghost" href={batchHref}>批次查看時間分佈</a></div>
        </div>
        <div className="statistics-keyword-groups"><div className="statistics-section-heading"><p className="scope-v2-eyebrow">EIGHT STYLE GROUPS</p><h3>風格關鍵詞群組</h3><span>每個群組可由使用者自行整理；目前只存在本頁草稿，不會未經 OAuth 寫入 Neon。</span></div><div className="statistics-group-grid">{KEYWORD_GROUPS.map(group=><section className="statistics-group-card" data-group={group} key={group}><div><strong>{group}</strong><span>{keywordGroups[group]?.length||0} 個</span></div><div className="statistics-group-terms">{(keywordGroups[group]||[]).map(term=><button type="button" key={term} onClick={()=>removeFromGroup(group,term)}>{term}<span aria-hidden="true">×</span></button>)}</div>{!(keywordGroups[group]||[]).length?<small>尚未加入關鍵詞</small>:null}</section>)}</div></div>
        <div className="scope-v2-ranking statistics-full-ranking">{shown.map((row,index)=><div key={row.ranking_key||row.term||index}><b>{(page-1)*PAGE_SIZE+index+1}. {row.term||row.title||row.name||'—'}</b><span>{row.item_count??'—'} · {row.rank_value??'—'} · <a href={'/search?q='+encodeURIComponent(row.term||row.title||row.name||'')}>查時間分佈</a></span></div>)}</div>{!loading&&!shown.length?<p>目前沒有可顯示的排行榜資料。</p>:null}{rankings.length?<div className="scope-v2-pagination"><span>第 {page} / {pages} 頁 · 共 {rankings.length} 筆</span><div><button type="button" disabled={page<=1} onClick={()=>setPage(value=>Math.max(1,value-1))}>上一頁</button><button type="button" disabled={page>=pages} onClick={()=>setPage(value=>Math.min(pages,value+1))}>下一頁</button></div></div>:null}</div>:null}
    </ScopeCardV2>
    <div className="statistics-summary"><span>{scopedCultureRows.length} 筆時間內容</span><span>{eras.length} 個時期</span><span>{days.length} 個日期</span><span>{sources.length} 種來源</span><span>排行榜 {rankings.length} 筆</span></div>
    <ScopeCardV2 eyebrow="Next Context Loop" title="統計 → 脈絡">
      <p>統計只提供線索；下一步回到脈絡界定關鍵字、補充來源與關係，再回到時間長河重新分析。</p>
      <p><a href="/context">回到脈絡關鍵字界定</a></p>
    </ScopeCardV2>
  </FeaturePageV2>;
}
