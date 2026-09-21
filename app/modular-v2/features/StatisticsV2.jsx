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
const PERSONAL_STYLE_DEFAULTS=Object.freeze([
  {id:'personal-1',label:'德',terms:[],locked:true,privateOnly:true,localOnly:true,publicProjection:false,includeInLocTotal:false,publicDetail:false,sourceScope:'lo3rwang'},
  {id:'personal-2',label:'黑暗領主／darklord',terms:[],locked:true,privateOnly:true,localOnly:true,publicProjection:false,sourceScope:'darklord',source:'twitter_private',includeInLocTotal:false,publicDetail:false},
  ...Array.from({length:6},(_,index)=>({id:'personal-'+(index+3),label:'個人風格 '+(index+3),terms:[],locked:false,privateOnly:true,localOnly:true,publicProjection:false,includeInLocTotal:false,publicDetail:false,sourceScope:'lo3rwang'}))
]);
const RANKING_PROFILES=Object.freeze([
  ...PERSONAL_STYLE_DEFAULTS.map(style=>({id:style.id,label:style.label,description:style.id==='personal-1'?'第一個個人風格':style.privateOnly?'私密文本統計，不進 LOC 總數':style.locked?'個人化私密來源':'可自行命名與整理',privateOnly:Boolean(style.privateOnly)})),
  {id:'runes',label:'月之符文',description:'預設特殊分類',privateOnly:false},
  {id:'annual',label:'每年分佈',description:'依年份統計',privateOnly:false}
]);
function hydratePersonalStyles(value){
  const saved=Array.isArray(value)?value:[];
  return PERSONAL_STYLE_DEFAULTS.map(def=>{
    const item=saved.find(style=>style.id===def.id)||{};
    return {...def,...item,label:def.locked?def.label:(item.label||def.label),terms:Array.isArray(item.terms)?item.terms:[]};
  });
}
const text=value=>String(value??'');
const numberFormat=value=>Number(value||0).toLocaleString('zh-TW');
const characterCount=value=>Array.from(text(value)).length;
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
  const body=value.body||value.content||value.description||value.summary||'';
  return {...value,id:value.id||value.entry_key||value.ranking_key||'stat-'+index,date:text(value.date||value.start_date).slice(0,10),kind:value.kind||value.entry_type||value.culture_type||'trajectory',title:value.title||value.name||value.term||value.label||'未命名',body,characterCount:Number(value.char_count||value.character_count||value.text_length)||characterCount(body),eraId:value.era_id||value.period_id||value.period||'',source:value.source||value.source_name||value.media_type||'',keywords:Array.isArray(value.keywords)?value.keywords:Array.isArray(value.tags)?value.tags:[],keywordGroup:value.keyword_group||value.group||value.rune_group||''};
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
  const personalStylesStorageKey='loc-personal-styles-v1:'+scopeId;
  const cultureView=scopeDataViewV2(scopeId,'culture');
  const rankingView=scopeDataViewV2(scopeId,'rankings');
  const [cultureRows,setCultureRows]=useState([]);
  const [rankingRows,setRankingRows]=useState([]);
  const [mode,setMode]=useState(section==='keyword'?'keywords':section==='eras'?'eras':section==='sources'?'sources':'units');
  const [rankingType,setRankingType]=useState('');
  const [rankingProfile,setRankingProfile]=useState('annual');
  const [page,setPage]=useState(1);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [dataMode,setDataMode]=useState('');
  const [sourceStats,setSourceStats]=useState(null);
  const [workManifest,setWorkManifest]=useState(null);
  const [rankLimit,setRankLimit]=useState(10);
  const [selectedTerms,setSelectedTerms]=useState([]);
  const [rangeMode,setRangeMode]=useState('year');
  const [selectedYearStart,setSelectedYearStart]=useState('');
  const [selectedYearEnd,setSelectedYearEnd]=useState('');
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
  const [targetPersonalStyle,setTargetPersonalStyle]=useState('personal-1');
  const [personalStyles,setPersonalStyles]=useState(()=>{
    if(typeof window==='undefined')return PERSONAL_STYLE_DEFAULTS;
    try{
      const stored=JSON.parse(window.localStorage.getItem(personalStylesStorageKey)||'null');
      return hydratePersonalStyles(stored);
    }catch{return PERSONAL_STYLE_DEFAULTS;}
  });
  useEffect(()=>{
    try{window.localStorage.setItem(personalStylesStorageKey,JSON.stringify(personalStyles));}catch{}
  },[personalStyles,personalStylesStorageKey]);
  const rankingProfiles=useMemo(()=>[
    ...personalStyles.map(style=>({id:style.id,label:style.label,description:style.privateOnly?'私密文本統計，不進 LOC 總數':style.id==='personal-1'?'第一個個人風格':'可自行命名與整理',privateOnly:Boolean(style.privateOnly)})),
    ...RANKING_PROFILES.filter(profile=>profile.id==='runes'||profile.id==='annual')
  ],[personalStyles]);

  useEffect(()=>{
    let live=true;
    setLoading(true);setError('');setDataMode('');
    Promise.all([
      cultureView?readNeonOrPublicFallback(()=>neonClient.from(cultureView).select('*').order('date',{ascending:true}).limit(5000),'/projections/loc-culture.json'):Promise.resolve({data:[],error:null}),
      rankingView?readNeonOrPublicFallback(()=>neonClient.from(rankingView).select('*').order('rank_value',{ascending:false}).limit(1000),'/projections/loc-rankings.json'):Promise.resolve({data:[],error:null}),
      fetch('/data/json/generated/search/SEARCH_SOURCE_STATS.json',{cache:'no-store'}).then(response=>response.ok?response.json():null).catch(()=>null),
      fetch('/data/json/generated/loc4/corpus/LOC4_TEXT_CORPUS_MANIFEST.json',{cache:'no-store'}).then(response=>response.ok?response.json():null).catch(()=>null)
    ]).then(([culture,rankings,summary,manifest])=>{
      if(live){
        setCultureRows((culture?.data||[]).map(normalize));
        setRankingRows(rankings?.data||[]);
        setSourceStats(summary);
        setWorkManifest(manifest);
        setDataMode(culture?.fallback||rankings?.fallback?'public-fallback':'neon-read');
      }
    }).catch(errorValue=>live&&setError(String(errorValue?.message||errorValue)))
      .finally(()=>live&&setLoading(false));
    return()=>{live=false};
  },[cultureView,rankingView]);

  const years=useMemo(()=>[...new Set(cultureRows.map(row=>yearOf(row.date)).filter(year=>/^\d{4}$/.test(year)))].sort().reverse(),[cultureRows]);
  const periods=useMemo(()=>[...new Set(cultureRows.map(row=>row.eraId).filter(Boolean))].sort(),[cultureRows]);
  useEffect(()=>{
    if(years.length){
      setSelectedYearStart(current=>current&&years.includes(current)?current:years[0]);
      setSelectedYearEnd(current=>current&&years.includes(current)?current:years[0]);
    }
  },[years]);
  useEffect(()=>{if(!selectedPeriod&&periods.length)setSelectedPeriod(periods[0]);},[periods,selectedPeriod]);
  const yearRangeStart=selectedYearStart&&selectedYearEnd?([selectedYearStart,selectedYearEnd].sort()[0]):selectedYearStart||selectedYearEnd||'';
  const yearRangeEnd=selectedYearStart&&selectedYearEnd?([selectedYearStart,selectedYearEnd].sort().at(-1)):selectedYearEnd||selectedYearStart||'';
  const inYearRange=year=>!yearRangeStart||!yearRangeEnd||(year>=yearRangeStart&&year<=yearRangeEnd);
  const scopedCultureRows=useMemo(()=>cultureRows.filter(row=>{
    if(rangeMode==='year')return inYearRange(yearOf(row.date));
    if(rangeMode==='period')return !selectedPeriod||row.eraId===selectedPeriod;
    return true;
  }),[cultureRows,rangeMode,yearRangeStart,yearRangeEnd,selectedPeriod]);
  const days=useMemo(()=>groupByDate(scopedCultureRows),[scopedCultureRows]);
  const eras=useMemo(()=>groupByEra(scopedCultureRows),[scopedCultureRows]);
  const sourceSummary=useMemo(()=>[...(Array.isArray(sourceStats?.text_sources)?sourceStats.text_sources:[]),...(Array.isArray(sourceStats?.media_sources)?sourceStats.media_sources:[])].map(item=>{const isLyrics=item.source_type==='lyrics'||item.source_category==='音樂'||item.content_counts?.lyrics!=null;const isWork=item.source_type==='work'||item.source_category==='作品';return {source:item.source||'未標記來源',total:Number(item.records||0),unit:isLyrics?'首':isWork?'部':'筆',searchable:Number(item.searchable_records??item.records??0),characters:Number(item.char_count||0),startDate:item.start_date||'',endDate:item.end_date||'',status:item.status||''};}).filter(item=>item.total>0),[sourceStats]);
  const sources=useMemo(()=>{if(!scopedCultureRows.length&&sourceSummary.length)return sourceSummary.map(item=>({source:item.source,total:item.total,searchable:item.searchable,characters:item.characters}));const map=new Map();for(const row of scopedCultureRows){const key=row.source||'未標記來源';map.set(key,(map.get(key)||0)+1);}return [...map.entries()].map(([source,total])=>({source,total})).sort((a,b)=>b.total-a.total);},[scopedCultureRows,sourceSummary]);
  const summaryRecords=useMemo(()=>scopedCultureRows.length||sourceSummary.reduce((sum,item)=>sum+item.total,0),[scopedCultureRows,sourceSummary]);
  const summarySearchable=useMemo(()=>sourceSummary.reduce((sum,item)=>sum+item.searchable,0),[sourceSummary]);
  const summaryCharacters=useMemo(()=>scopedCultureRows.length?scopedCultureRows.reduce((sum,row)=>sum+row.characterCount,0):sourceSummary.reduce((sum,item)=>sum+item.characters,0),[scopedCultureRows,sourceSummary]);
  const authoredWorkCount=Array.isArray(workManifest?.works)?workManifest.works.length:0;
  const authoredDocumentCount=Number(workManifest?.document_count||0);
  const derivedRankings=useMemo(()=>deriveKeywordRankings(scopedCultureRows),[scopedCultureRows]);
  const scopedRankingRows=useMemo(()=>rankingRows.filter(row=>{
    const payload=row?.payload&&typeof row.payload==='object'?row.payload:{};
    const periodId=row.period||row.era_id||row.period_id||payload.period||payload.era_id||payload.period_id||'';
    const rowDate=row.date||row.start_date||payload.date||payload.start_date||'';
    const rowYear=row.year||payload.year||'';
    if(rangeMode==='period'&&selectedPeriod)return periodId===selectedPeriod;
    if(rangeMode==='year')return inYearRange(yearOf(rowDate))||inYearRange(text(rowYear));
    return true;
  }),[rankingRows,rangeMode,yearRangeStart,yearRangeEnd,selectedPeriod]);
  const rankingTypes=useMemo(()=>[...new Set(scopedRankingRows.map(row=>row.ranking_type).filter(Boolean))],[scopedRankingRows]);
  useEffect(()=>{if(rankingTypes.length&&!rankingTypes.includes(rankingType))setRankingType(rankingTypes[0]);},[rankingTypes,rankingType]);
  const activePersonalStyle=personalStyles.find(style=>style.id===rankingProfile)||personalStyles[0];
  const personalRankings=useMemo(()=>{
    const terms=new Set(activePersonalStyle?.terms||[]);
    return derivedRankings.filter(row=>terms.has(row.term));
  },[derivedRankings,activePersonalStyle]);
  const rankingSource=useMemo(()=>{
    if(rankingProfile==='runes')return scopedRankingRows.filter(row=>!rankingType||row.ranking_type===rankingType);
    if(rankingProfile==='annual')return derivedRankings.length?derivedRankings:scopedRankingRows;
    if(activePersonalStyle?.sourceScope==='darklord')return [];
    if(activePersonalStyle?.localOnly)return personalRankings;
    if(activePersonalStyle?.privateOnly)return [];
    return personalRankings;
  },[rankingProfile,scopedRankingRows,rankingType,derivedRankings,personalRankings]);
  const rankings=useMemo(()=>rankingSource.filter(row=>rankingProfile==='runes'||!rankingType||row.ranking_type===rankingType),[rankingSource,rankingProfile,rankingType]);
  const pages=Math.max(1,Math.ceil(rankings.length/PAGE_SIZE));
  const shown=rankings.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);
  const topTen=useMemo(()=>rankings.slice(0,10),[rankings]);
  const visibleTop=useMemo(()=>rankings.slice(0,rankLimit),[rankings,rankLimit]);
  const autoTerms=useMemo(()=>topTen.map(row=>row.term||row.title||row.name).filter(Boolean),[topTen]);
  useEffect(()=>{setSelectedTerms(autoTerms);},[autoTerms]);
  const termHistory=useMemo(()=>{const map=new Map();for(const row of rankingSource){const term=row.term||row.title||row.name;if(!term)continue;const current=map.get(term)||new Set();current.add(row.ranking_type||'總榜');map.set(term,current);}return map;},[rankingSource]);
  const addSelectedToGroup=()=>setKeywordGroups(current=>({...current,[targetKeywordGroup]:[...new Set([...(current[targetKeywordGroup]||[]),...selectedTerms])]}));
  const addSelectedToPersonalStyle=()=>setPersonalStyles(current=>current.map(style=>style.id===targetPersonalStyle?{...style,terms:[...new Set([...(style.terms||[]),...selectedTerms])]}:style));
  const renamePersonalStyle=(id,label)=>setPersonalStyles(current=>current.map(style=>style.id===id&&!style.locked?{...style,label:label||'未命名風格'}:style));
  const removeFromPersonalStyle=(id,term)=>setPersonalStyles(current=>current.map(style=>style.id===id?{...style,terms:(style.terms||[]).filter(item=>item!==term)}:style));
  const removeFromGroup=(group,term)=>setKeywordGroups(current=>({...current,[group]:(current[group]||[]).filter(item=>item!==term)}));
  const batchHref=selectedTerms.length?'/search?terms='+encodeURIComponent(selectedTerms.join('|')):'/search';
  const rangeLabel=rangeMode==='year'?(yearRangeStart&&yearRangeEnd?(yearRangeStart===yearRangeEnd?yearRangeStart:yearRangeStart+'–'+yearRangeEnd):'年度'):rangeMode==='period'?(selectedPeriod||'時期'):'全部資料';
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
          {rangeMode==='year'?<><label>起始年<select value={selectedYearStart} onChange={event=>{setSelectedYearStart(event.target.value);setPage(1)}}>{years.map(year=><option key={year}>{year}</option>)}</select></label><label>結束年<select value={selectedYearEnd} onChange={event=>{setSelectedYearEnd(event.target.value);setPage(1)}}>{years.map(year=><option key={year}>{year}</option>)}</select></label></>:null}
          {rangeMode==='period'?<label>時期<select value={selectedPeriod} onChange={event=>{setSelectedPeriod(event.target.value);setPage(1)}}>{periods.map(period=><option key={period}>{period}</option>)}</select></label>:null}
        </div>
        <div className="statistics-range-summary"><strong>{rangeLabel}</strong><span>{scopedCultureRows.length||summaryRecords} 筆內容 · {days.length} 個日期 · {periods.length} 個可用時期</span></div>
      </section>
      {loading?<p className="scope-v2-status">載入展示資料…</p>:null}
      {!loading&&dataMode==='public-fallback'?<p className="scope-v2-status" role="status">目前使用公開唯讀投影展示；Neon 尚未提供即時資料，頁面不因此中斷。</p>:null}
      {error?<p className="scope-v2-status" role="status">統計讀取狀態：{error}。目前仍保留 0 筆或本地摘要展示。</p>:null}
      <div className="statistics-range-summary statistics-data-summary" aria-label="資料摘要"><strong>來源統計</strong><span>{sourceSummary.map(item=>item.source+' '+numberFormat(item.total)+item.unit).join(' · ')||'目前 0 筆可展示資料'} · 可搜尋資料依來源顯示 · {numberFormat(summaryCharacters)} 個文字字元 · LOC4 作品 {numberFormat(authoredWorkCount)} 部／文件 {numberFormat(authoredDocumentCount)} 篇 · bytes 僅屬檔案傳輸資訊，不列入內容數量。</span></div>
      {!loading&&!summaryRecords&&!summaryCharacters?<p className="scope-v2-status" role="status">目前是 0 筆可展示資料，資料來源恢復後會保留此頁結構，不會變成空白中斷。</p>:null}
      {mode!=='keywords'?<div className="statistics-chart"><ResponsiveContainer width="100%" height={340}><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="var(--loc-line)"/><XAxis dataKey={mode==='eras'?'era':mode==='sources'?'source':'date'} tick={{fill:'currentColor',fontSize:11}}/><YAxis allowDecimals={false} tick={{fill:'currentColor',fontSize:11}}/><Tooltip/><Bar dataKey="total" fill="var(--loc-accent)" radius={[6,6,0,0]}/>{mode==='units'?<><Bar dataKey="works" fill="var(--loc-gold)" radius={[6,6,0,0]}/><Bar dataKey="events" fill="var(--loc-muted)" radius={[6,6,0,0]}/></>:null}</BarChart></ResponsiveContainer></div>:null}
      {mode==='keywords'?<div className="statistics-ranking">
        <div className="statistics-ranking-head"><div><p className="scope-v2-eyebrow">KEYWORD RANKING</p><h3>{rangeLabel}關鍵字排行榜</h3><span>十種展示視圖：八個本機個人風格、一個月之符文公開示範、一個每年分佈。</span></div></div>
        <div className="statistics-profile-panel"><div className="statistics-section-heading"><div><p className="scope-v2-eyebrow">TEN RANKING VIEWS</p><h3>選擇分析視圖</h3></div><span>個人風格群組預設只存本機、不進 LOC 總數；只有月之符文示範視圖預設公開。</span></div><div className="statistics-profile-grid">{rankingProfiles.map(profile=><button type="button" key={profile.id} className="statistics-profile-card" data-profile={profile.id} data-private={profile.privateOnly?'true':'false'} aria-pressed={rankingProfile===profile.id} onClick={()=>{setRankingProfile(profile.id);setPage(1)}}><strong>{profile.label}</strong><small>{profile.description}</small></button>)}</div>{rankingProfile==='runes'&&rankingTypes.length?<div className="scope-v2-tabs" aria-label="符文排行榜類型">{rankingTypes.map(item=><button type="button" key={item} aria-pressed={rankingType===item} onClick={()=>{setRankingType(item);setPage(1)}}>{item}</button>)}</div>:null}</div>
        <div className="statistics-top-ten">
          <div className="statistics-top-ten-heading"><div><p className="scope-v2-eyebrow">TOP 10 · AUTO INCLUDED</p><h3>批次整理候選</h3></div><span>{selectedTerms.length} 個關鍵詞已加入</span></div>
          <div className="scope-v2-ranking">{visibleTop.map((row,index)=>{const term=row.term||row.title||row.name||'—';const repeated=termHistory.get(term)?.size||1;return <div className="statistics-ranking-row" key={'top-'+(row.ranking_key||term||index)}><label><input type="checkbox" checked={selectedTerms.includes(term)} onChange={()=>setSelectedTerms(current=>current.includes(term)?current.filter(value=>value!==term):[...current,term])}/><b>{index+1}. {term}</b></label><span>{row.item_count??'—'} 筆 · {repeated>1?'跨 '+repeated+' 個排名':'單一排名'} · <a href={'/search?q='+encodeURIComponent(term)}>查看分佈</a></span></div>})}</div>
          <div className="statistics-batch-controls"><label>排行榜展示筆數<input type="number" min="1" max="200" value={rankLimit} onChange={event=>setRankLimit(Math.min(200,Math.max(1,Number(event.target.value)||1)))} /></label><label>加入個人風格<select value={targetPersonalStyle} onChange={event=>setTargetPersonalStyle(event.target.value)}>{personalStyles.map(style=><option key={style.id} value={style.id}>{style.label}</option>)}</select></label><button type="button" className="context-btn primary" onClick={addSelectedToPersonalStyle}>批次加入個人風格</button><label>加入符文分類<select value={targetKeywordGroup} onChange={event=>setTargetKeywordGroup(event.target.value)}>{KEYWORD_GROUPS.map(group=><option key={group}>{group}</option>)}</select></label><button type="button" className="context-btn ghost" onClick={addSelectedToGroup}>加入符文分類</button><a className="context-btn ghost" href={batchHref}>批次查看時間分佈</a><small>展示筆數可調整 1–200；前 10 名自動加入批次清單。調整先存在本機，OAuth 後才同步 Neon。</small></div>
        </div>
        <div className="statistics-keyword-groups"><div className="statistics-section-heading"><p className="scope-v2-eyebrow">EIGHT PERSONAL STYLES</p><h3>個人設定風格</h3><span>八個風格由使用者自行命名與整理；第一個預設名稱是「政德」。</span></div><div className="statistics-group-grid">{personalStyles.map(style=><section className="statistics-group-card" data-group={style.id} key={style.id}><div><input className="statistics-style-name" value={style.label} disabled={style.locked} onChange={event=>renamePersonalStyle(style.id,event.target.value)} aria-label={style.label+'名稱'}/><span>{style.terms?.length||0} 個</span></div><div className="statistics-group-terms">{(style.terms||[]).map(term=><button type="button" key={term} onClick={()=>removeFromPersonalStyle(style.id,term)}>{term}<span aria-hidden="true">×</span></button>)}</div>{!(style.terms||[]).length?<small>尚未加入關鍵詞</small>:null}</section>)}</div></div>
        <div className="statistics-keyword-groups statistics-rune-groups"><div className="statistics-section-heading"><p className="scope-v2-eyebrow">SPECIAL DEFAULT · LUNARUNES</p><h3>月之符文分類</h3><span>這是預設特殊分類，不等同於八個個人風格。</span></div><div className="statistics-group-grid">{KEYWORD_GROUPS.map(group=><section className="statistics-group-card" data-group={group} key={group}><div><strong>{group}</strong><span>{keywordGroups[group]?.length||0} 個</span></div><div className="statistics-group-terms">{(keywordGroups[group]||[]).map(term=><button type="button" key={term} onClick={()=>removeFromGroup(group,term)}>{term}<span aria-hidden="true">×</span></button>)}</div>{!(keywordGroups[group]||[]).length?<small>尚未加入關鍵詞</small>:null}</section>)}</div></div>
        <div className="scope-v2-ranking statistics-full-ranking">{shown.map((row,index)=><div key={row.ranking_key||row.term||index}><b>{(page-1)*PAGE_SIZE+index+1}. {row.term||row.title||row.name||'—'}</b><span>{row.item_count??'—'} · {row.rank_value??'—'} · <a href={'/search?q='+encodeURIComponent(row.term||row.title||row.name||'')}>查時間分佈</a></span></div>)}</div>{!loading&&!shown.length?<p>目前沒有可顯示的排行榜資料。</p>:null}{rankings.length?<div className="scope-v2-pagination"><span>第 {page} / {pages} 頁 · 共 {rankings.length} 筆</span><div><button type="button" disabled={page<=1} onClick={()=>setPage(value=>Math.max(1,value-1))}>上一頁</button><button type="button" disabled={page>=pages} onClick={()=>setPage(value=>Math.min(pages,value+1))}>下一頁</button></div></div>:null}</div>:null}
    </ScopeCardV2>
    <div className="statistics-summary"><span>{scopedCultureRows.length} 筆時間內容</span><span>{eras.length} 個時期</span><span>{days.length} 個日期</span><span>{sources.length} 種來源</span><span>排行榜 {rankings.length} 筆</span></div>
    <ScopeCardV2 eyebrow="Next Context Loop" title="統計 → 脈絡">
      <p>統計只提供線索；下一步回到脈絡界定關鍵字、補充來源與關係，再回到時間長河重新分析。</p>
      <p><a href="/context">回到脈絡關鍵字界定</a></p>
    </ScopeCardV2>
  </FeaturePageV2>;
}
