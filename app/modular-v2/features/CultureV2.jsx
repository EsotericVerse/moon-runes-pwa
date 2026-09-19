'use client';

import {useEffect,useMemo,useState} from 'react';
import {CULTURE_PATHS_V2} from '../../migration-bridges/current-data-compat.v2';
import {fetchLocJson,fetchLocJsonBatch} from '../../loc/data';
import FeaturePageV2 from '../FeaturePageV2';
import {ScopeCardV2} from '../PageShellV2';
import {useScopeRuntimeV2} from '../use-scope-runtime.v2';

function periodRows(value){
  if(!value||typeof value!=='object')return [];
  for(const key of ['periods','period_analysis','period_keyword_analysis','results'])if(Array.isArray(value[key]))return value[key];
  return [];
}
function keywordsOf(row){return row?.normalized_top_keywords||row?.keywords||row?.semantic_keywords||row?.top_keywords||[];}
function itemLabel(value,index){return value?.display_label||value?.name||value?.title||value?.period||`項目 ${index+1}`;}

const PROFILE=Object.freeze({
  loc:Object.freeze({subtitle:'文化以時間累積的語言、事件、時期與治理變化為核心。',sections:['eras','events']}),
  runes:Object.freeze({subtitle:'月之符文文化：符號式語言在時間中的語意、治理與符文歷程。',sections:['runeHistory','runes']}),
  lo3rwang:Object.freeze({subtitle:'作者文化：時期、作品語彙、創作與治理文字在時間中的變化。',sections:['eras','authorKeywords','periods']}),
  admin:Object.freeze({subtitle:'管理 Scope 的文化頁只呈現治理變化與歷史，不取代各 Scope 的 Current Authority。',sections:['governanceHistory']})
});

export default function CultureV2(){
  const {scopeId}=useScopeRuntimeV2();
  const profile=PROFILE[scopeId]||PROFILE.loc;
  const [data,setData]=useState({});
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    let live=true;
    setLoading(true);setError('');setData({});
    const wanted=new Set(profile.sections);
    const requests=[];
    const keys=[];
    const add=(key,path)=>{keys.push(key);requests.push(path);};
    if(wanted.has('eras'))add('eras',CULTURE_PATHS_V2.eraRegistry);
    if(wanted.has('events'))add('events',CULTURE_PATHS_V2.eventSnapshot);
    if(wanted.has('runeHistory')||wanted.has('governanceHistory'))add('runeHistory',CULTURE_PATHS_V2.runeHistory);
    if(wanted.has('runes'))add('runes',CULTURE_PATHS_V2.runes);
    if(wanted.has('authorKeywords'))add('authorKeywords',CULTURE_PATHS_V2.authorKeywords);
    if(wanted.has('periods')){add('musicPeriods',CULTURE_PATHS_V2.musicPeriods);add('writingPeriods',CULTURE_PATHS_V2.writingGovernancePeriods);}
    fetchLocJsonBatch(requests,{concurrency:2})
      .then(values=>{if(live)setData(Object.fromEntries(keys.map((key,index)=>[key,values[index]])));})
      .catch(e=>live&&setError(String(e?.message||e)))
      .finally(()=>live&&setLoading(false));
    return()=>{live=false};
  },[scopeId,profile.sections]);

  const eraRows=useMemo(()=>[...(data.eras?.eras||[])].sort((a,b)=>Number(a.order||0)-Number(b.order||0)),[data.eras]);
  const eventRows=useMemo(()=>[...(data.events?.events||[])].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))),[data.events]);
  const musicRows=periodRows(data.musicPeriods);
  const writingRows=periodRows(data.writingPeriods);
  const runeStages=data.runeHistory?.system_stages||[];
  const runeGovernance=data.runeHistory?.governance_evolution||[];
  const runeCases=data.runeHistory?.semantic_history_cases||[];
  const authorKeywords=data.authorKeywords?.keywords||[];

  return <FeaturePageV2 featureId="culture" subtitle={profile.subtitle}>
    {loading?<p className="scope-v2-status">載入文化資料…</p>:null}
    {error?<p className="scope-v2-status scope-v2-error">{error}</p>:null}

    {profile.sections.includes('eras')?<ScopeCardV2 eyebrow="ERA" title="時期">
      <div className="scope-v2-timeline">{eraRows.map((item,index)=><article key={item.era_id||item.period||index}>
        <strong>{itemLabel(item,index)}</strong>
        <span>{item.start_date||'—'} → {item.end_date||'現在'}</span>
        {item.description?<p>{item.description}</p>:null}
      </article>)}</div>
    </ScopeCardV2>:null}

    {profile.sections.includes('events')?<ScopeCardV2 eyebrow="Timeline" title="時間線">
      <div className="scope-v2-timeline">{eventRows.slice(0,40).map((item,index)=><article key={item.id||index}>
        <strong>{item.title||itemLabel(item,index)}</strong>
        <span>{item.date||''}</span>
        {item.description?<p>{item.description}</p>:null}
      </article>)}</div>
    </ScopeCardV2>:null}

    {profile.sections.includes('runeHistory')?<ScopeCardV2 eyebrow="LunaRunes Culture" title="符文語意與治理歷程">
      <div className="scope-v2-timeline">{runeCases.map((item,index)=><article key={item.order||index}>
        <strong>{item.title||itemLabel(item,index)}</strong>
        {item.after?<p>{item.after}</p>:null}
        {item.note?<small>{item.note}</small>:null}
      </article>)}</div>
      {runeStages.length?<div className="scope-v2-chip-list">{runeStages.map((item,index)=><span key={item.order||index}>{item.label} · {item.rune_count} 符</span>)}</div>:null}
    </ScopeCardV2>:null}

    {profile.sections.includes('authorKeywords')?<ScopeCardV2 eyebrow="Culture Keywords" title="作者文化關鍵字">
      <div className="scope-v2-chip-list">{authorKeywords.map((item,index)=><span key={item.name||index}>{item.name}</span>)}</div>
    </ScopeCardV2>:null}

    {profile.sections.includes('periods')?<div className="scope-v2-grid-two">
      <ScopeCardV2 eyebrow="Music" title="音樂時期風格">
        <div className="scope-v2-timeline">{musicRows.map((row,index)=><article key={row.period||index}>
          <strong>{row.period||row.canonical_period||`切片 ${index+1}`}</strong>
          <div className="scope-v2-chip-list">{keywordsOf(row).slice(0,10).map((item,i)=><span key={item.term||item.keyword||i}>{item.term||item.keyword}</span>)}</div>
        </article>)}</div>
      </ScopeCardV2>
      <ScopeCardV2 eyebrow="Writing / Governance" title="文字與治理時期風格">
        <div className="scope-v2-timeline">{writingRows.map((row,index)=><article key={row.period||index}>
          <strong>{row.period||row.canonical_period||`切片 ${index+1}`}</strong>
          <div className="scope-v2-chip-list">{keywordsOf(row).slice(0,10).map((item,i)=><span key={item.term||item.keyword||i}>{item.term||item.keyword}</span>)}</div>
        </article>)}</div>
      </ScopeCardV2>
    </div>:null}

    {profile.sections.includes('governanceHistory')?<ScopeCardV2 eyebrow="Governance History" title="治理變化">
      <div className="scope-v2-timeline">{runeGovernance.map((item,index)=><article key={item.order||index}>
        <strong>{item.title||itemLabel(item,index)}</strong>
        {item.after?<p>{item.after}</p>:null}
        {item.effect?<small>{item.effect}</small>:null}
      </article>)}</div>
    </ScopeCardV2>:null}
  </FeaturePageV2>;
}
