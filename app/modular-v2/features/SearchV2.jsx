'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {DataSet,Timeline} from 'vis-timeline/standalone';
import FeaturePageV2 from '../FeaturePageV2';
import {ScopeCardV2} from '../PageShellV2';
import {scopeDataViewV2} from '../scope-registry.v2';
import {useScopeRuntimeV2} from '../use-scope-runtime.v2';
import {neonClient,readNeonOrPublicFallback} from '../../loc/neon-client';
import {fetchLocDataSegments,fetchLocJsonBatch} from '../../loc/data';

const DAY_MS=24*60*60*1000;
const SEGMENT_BATCH_SIZE=2;
async function boundedLocalImportAdapter(datasetId,segments,requests=[]){
  const localSources=await fetchLocJsonBatch(requests,{concurrency:2});
  const ordered=Array.isArray(segments)?segments:[];
  const loaded=[];
  for(let offset=0;offset<ordered.length;offset+=SEGMENT_BATCH_SIZE){
    const chunk=ordered.slice(offset,offset+SEGMENT_BATCH_SIZE);
    const batch=await fetchLocDataSegments(datasetId,{segmentIds:chunk.map(segment=>segment.id),maxSegments:SEGMENT_BATCH_SIZE});
    loaded.push(...batch);
  }
  return {localSources,loaded};
}
const text=value=>String(value??'');
function normalize(row,index){const payload=row?.payload&&typeof row.payload==='object'?row.payload:{};const value={...row,...payload};return {...value,id:value.id||value.entry_key||value.event_id||value.work_id||'search-'+index,kind:value.kind||value.entry_type||value.culture_type||'trajectory',title:value.title||value.name||value.label||value.term||'未命名',date:text(value.date||value.start_date).slice(0,10),body:value.body||value.content||value.description||value.summary||'',source:value.source||value.source_name||value.media_type||'',eraId:value.era_id||value.period_id||value.period||'',url:value.url||value.href||''};}
function distanceDays(a,b){return Math.round(Math.abs(new Date(a).getTime()-new Date(b).getTime())/DAY_MS);}
function score(row,query){const terms=query.split('|').map(value=>value.trim().toLocaleLowerCase()).filter(Boolean);return Math.max(0,...terms.map(q=>(text(row.title).toLocaleLowerCase().includes(q)?8:0)+(text(row.body).toLocaleLowerCase().includes(q)?5:0)+(text(row.source).toLocaleLowerCase().includes(q)?3:0)+(text(row.eraId).toLocaleLowerCase().includes(q)?2:0)));}
function kindLabel(kind){return ({era:'時期',event:'事件',trajectory:'軌跡',work:'作品',recommendation:'推薦作品'})[kind]||'內容';}

export default function SearchV2(){
  const {scopeId}=useScopeRuntimeV2();
  const searchParams=useSearchParams();
  const view=scopeDataViewV2(scopeId,'culture');
  const timelineRef=useRef(null);
  const [rows,setRows]=useState([]);
  const [query,setQuery]=useState('');
  const [submitted,setSubmitted]=useState('');
  const [anchor,setAnchor]=useState(null);
  const [windowDays,setWindowDays]=useState(90);
  const [selected,setSelected]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [status,setStatus]=useState('從統計或關鍵字入口開始搜尋。');

  useEffect(()=>{const q=text(searchParams?.get('q')).trim();const terms=text(searchParams?.get('terms')).trim();const value=terms||q;if(value){setQuery(value.split('|').join('、'));setSubmitted(value)}},[searchParams]);
  useEffect(()=>{let live=true;setLoading(true);setError('');if(!view){setError('此 Scope 尚未設定搜尋用 Culture projection。');setLoading(false);return()=>{live=false};}readNeonOrPublicFallback(neonClient.from(view).select('*').order('date',{ascending:true}).limit(5000),'/projections/loc-culture.json').then(result=>{if(result?.error)throw new Error(result.error.message||'Search SQL projection 讀取失敗');if(live)setRows((result?.data||[]).map(normalize));}).catch(errorValue=>live&&setError(String(errorValue?.message||errorValue))).finally(()=>live&&setLoading(false));return()=>{live=false};},[view]);

  const matches=useMemo(()=>{const q=submitted.trim();if(!q)return [];return rows.map(row=>({...row,matchScore:score(row,q)})).filter(row=>row.matchScore>0).sort((a,b)=>b.matchScore-a.matchScore||a.date.localeCompare(b.date));},[rows,submitted]);
  useEffect(()=>{setAnchor(matches[0]||null);setSelected(null);setStatus(matches.length?'找到 '+matches.length+' 筆與「'+submitted+'」相關的內容。':'尚未找到「'+submitted+'」的時間錨點。');},[matches,submitted]);
  const nearby=useMemo(()=>{if(!anchor)return [];return rows.filter(row=>row.date&&distanceDays(row.date,anchor.date)<=windowDays).sort((a,b)=>a.date.localeCompare(b.date)||a.title.localeCompare(b.title));},[rows,anchor,windowDays]);
  const recommendations=useMemo(()=>nearby.filter(row=>row.kind==='recommendation'||row.kind==='work').sort((a,b)=>(b.kind==='recommendation')-(a.kind==='recommendation')||a.date.localeCompare(b.date)),[nearby]);

  useEffect(()=>{if(!timelineRef.current||!nearby.length)return;const items=new DataSet(nearby.map(row=>({id:row.id,content:row.title,start:row.date,type:'box',group:row.eraId||'unassigned',className:'search-anchor-item search-anchor-'+row.kind})));const groups=new DataSet([...new Set(nearby.map(row=>row.eraId||'unassigned'))].map(id=>({id,content:id==='unassigned'?'未分期':id})));const timeline=new Timeline(timelineRef.current,items,groups,{stack:true,zoomable:true,moveable:true,orientation:'top',verticalScroll:true,zoomKey:'ctrlKey',maxHeight:'560px',minHeight:'340px',showCurrentTime:true});timeline.on('select',event=>{const id=event.items?.[0];if(id)setSelected(nearby.find(row=>row.id===id)||null)});return()=>timeline.destroy();},[nearby]);

  function run(event){event.preventDefault();setSubmitted(query.trim())}
  return <FeaturePageV2 featureId="search" subtitle="從統計關鍵字找到時間錨點，再展開附近作品、事件、文字與來源。">
    <ScopeCardV2 eyebrow="Search · Time Anchor" title="時空定錨搜尋">
      <form className="scope-v2-search-form" onSubmit={run}><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="輸入統計看到的關鍵字、概念或時期" aria-label="時間定錨搜尋"/><button type="submit">找到時間錨點</button></form>
      <div className="search-anchor-controls"><label>前後時間窗<select value={windowDays} onChange={event=>setWindowDays(Number(event.target.value))}><option value="30">前後 30 日</option><option value="90">前後 90 日</option><option value="365">前後 1 年</option><option value="1825">前後 5 年</option></select></label><span>{loading?'載入 SQL projection…':error||status}</span></div>
      {anchor?<div className="search-anchor-card"><p className="scope-v2-eyebrow">TIME ANCHOR</p><h3>{anchor.date} · {anchor.title}</h3><p>{anchor.body||'命中內容沒有附帶文字摘要。'}</p><span>{kindLabel(anchor.kind)} · {anchor.source||'未標記來源'} · {anchor.eraId||'未分期'}</span><p><a className="context-btn ghost" href={'/culture?draftKind=era&draftDate='+encodeURIComponent(anchor.date)+'&draftTitle='+encodeURIComponent('候選時期：'+anchor.title)+'&draftEraId='+encodeURIComponent(anchor.eraId||'')}>建立時期候選（手動確認）</a></p><small>系統只預填候選，不會自動建立或改動既有版號。</small></div>:null}
      <div ref={timelineRef} className="search-anchor-timeline" aria-label="搜尋時間錨點附近內容"/>
      {!anchor&&!loading?<div className="culture-river-empty">請從統計頁點選關鍵字，或直接輸入概念；搜尋會先找時間點，再展開附近資料。</div>:null}
    </ScopeCardV2>
    {anchor?<div className="search-anchor-layout">
      <ScopeCardV2 eyebrow="Recommended Works" title="時期代表作品"><div className="scope-v2-ranking">{recommendations.slice(0,12).map(row=><div key={row.id}><b>{row.date} · {row.title}</b><span>{kindLabel(row.kind)} · {row.source||'—'}</span></div>)}</div></ScopeCardV2>
      <ScopeCardV2 eyebrow="Nearby Distribution" title="錨點附近的作品與事件"><div className="search-anchor-list">{nearby.slice(0,30).map(row=><button type="button" key={row.id} onClick={()=>setSelected(row)}><b>{row.date} · {row.title}</b><span>{kindLabel(row.kind)} · {row.source||'—'}</span></button>)}</div></ScopeCardV2>
    </div>:null}
    {selected?<ScopeCardV2 eyebrow="Selected Record" title={selected.title}><p>{selected.body||'沒有文字紀錄。'}</p><p>{selected.date} · {kindLabel(selected.kind)} · {selected.source||'—'}</p>{selected.url?<p><a href={selected.url} target="_blank" rel="noreferrer">查看來源</a></p>:null}<p><a href={'/context?q='+encodeURIComponent(selected.title)}>回到脈絡界定</a></p></ScopeCardV2>:null}
  </FeaturePageV2>;
}
