'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {SEARCH_DATASETS_V2} from '../../migration-bridges/current-data-compat.v2';
import {fetchLocDataSegments,fetchLocJson,fetchLocJsonBatch,getLocDataDataset,LOC_DATA} from '../../loc/data';
import {useLocalStore} from '../../loc/local-store';
import {getSearchCollection} from '../../loc/search-collections';
import {applySearchGovernance,firstGovernedMatch} from '../../loc/search-governance';
import {recordSearchSegmentHits,rankSearchSegments} from '../../loc/search-routing';
import {recordSearchTelemetry} from '../../loc/search-telemetry';
import FeaturePageV2 from '../FeaturePageV2';
import {ScopeCardV2} from '../PageShellV2';
import {featureHrefV2} from '../scope-registry.v2';
import {useScopeRuntimeV2} from '../use-scope-runtime.v2';

const UI_SETTINGS_KEY='loc-ui-settings-v1';
const DEFAULT_UI_SETTINGS={list_page_size:10};
const LIST_PAGE_OPTIONS=[5,10,15,20,25,50];
const MAX_RAW_RESULTS=120;
const SEGMENT_BATCH_SIZE=2;
const norm=value=>String(value??'').toLocaleLowerCase('zh-Hant').replace(/[\s\u3000]+/g,'');
const snippet=(text,q)=>{
  const raw=String(text||'').replace(/\s+/g,' ').trim();
  const i=norm(raw).indexOf(norm(q));
  const start=Math.max(0,(i<0?0:i)-70);
  return `${start?'…':''}${raw.slice(start,start+220)}${raw.length>start+220?'…':''}`;
};

function objectsFrom(value,out=[],depth=0){
  if(depth>4)return out;
  if(Array.isArray(value)){
    for(const item of value){
      if(item&&typeof item==='object'&&!Array.isArray(item))out.push(item);
      else objectsFrom(item,out,depth+1);
    }
    return out;
  }
  if(value&&typeof value==='object')for(const child of Object.values(value))if(Array.isArray(child))objectsFrom(child,out,depth+1);
  return out;
}
function genericResult(item,source,terms,displayQuery){
  const hay=JSON.stringify(item);
  const matched=firstGovernedMatch(hay,terms);
  if(!matched)return null;
  const title=item.title||item.name||item['符文名稱']||item['名稱']||item.question||item.label||item.id||item.work_id||source;
  const body=item.text||item.content||item.answer||item.summary||item.description||item.retrieval_text||hay;
  return {key:`${source}-${title}-${body.slice(0,30)}`,source,title,date:item.date||item.created_date||item.updated_at||'',snippet:snippet(body,matched||displayQuery),href:item.url||item.href||''};
}
function collectGeneric(data,label,terms,displayQuery,found){
  for(const item of objectsFrom(data)){
    const result=genericResult(item,label,terms,displayQuery);
    if(result)found.push(result);
    if(found.length>=MAX_RAW_RESULTS)return;
  }
}
function collectText(data,terms,displayQuery,found){
  for(const row of data?.documents||[]){
    const hay=`${row.title||''} ${row.section||''} ${row.retrieval_text||row.text||''}`;
    const matched=firstGovernedMatch(hay,terms);
    if(matched)found.push({key:row.id,source:'文字創作',title:[row.title,row.section].filter(Boolean).join(' · '),date:row.date||'',snippet:snippet(row.text||row.retrieval_text,matched||displayQuery)});
    if(found.length>=MAX_RAW_RESULTS)return;
  }
}
function collectMusic(data,terms,displayQuery,found){
  for(const row of data?.works||[]){
    const hay=`${row.title||''} ${row.summary||''} ${row.style||''} ${(row.tags||[]).join(' ')} ${row.retrieval_text||''}`;
    const matched=firstGovernedMatch(hay,terms);
    if(matched)found.push({key:row.work_id,source:'音樂',title:row.title,date:row.created_date||'',snippet:snippet(row.summary||row.retrieval_text,matched||displayQuery),href:row.versions?.[0]?.suno_url||''});
    if(found.length>=MAX_RAW_RESULTS)return;
  }
}
function matchCultureKeyword(data,q){
  const target=norm(q);
  if(!target)return null;
  for(const item of data?.keywords||[]){
    const terms=[item.name,...(item.aliases||[])];
    if(terms.some(term=>norm(term)===target))return item;
  }
  for(const item of data?.keywords||[]){
    const terms=[item.name,...(item.aliases||[])];
    if(terms.some(term=>norm(term).includes(target)||target.includes(norm(term))))return item;
  }
  return null;
}

export default function SearchV2(){
  const {scopeId,scope}=useScopeRuntimeV2();
  const searchParams=useSearchParams();
  const {value:uiSettings}=useLocalStore(UI_SETTINGS_KEY,DEFAULT_UI_SETTINGS);
  const [query,setQuery]=useState('');
  const [results,setResults]=useState([]);
  const [cultureKeyword,setCultureKeyword]=useState(null);
  const [status,setStatus]=useState('輸入文字後才會載入搜尋資料。');
  const [error,setError]=useState('');
  const [page,setPage]=useState(1);
  const searchId=useRef(0);
  const pageSize=LIST_PAGE_OPTIONS.includes(Number(uiSettings?.list_page_size))?Number(uiSettings.list_page_size):10;
  const pageCount=Math.max(1,Math.ceil(results.length/pageSize));
  const shownResults=results.slice((page-1)*pageSize,page*pageSize);
  const cultureWorks=useMemo(()=>results.filter(row=>row.source!=='政德文化').slice(0,8),[results]);
  const collection=getSearchCollection(scope.searchCollection);

  useEffect(()=>{
    const q=String(searchParams?.get('q')||'').trim();
    if(q)setQuery(q);
  },[searchParams]);
  useEffect(()=>setPage(1),[scopeId,pageSize]);
  useEffect(()=>{if(page>pageCount)setPage(pageCount)},[page,pageCount]);

  async function executeSearch(rawQuery){
    const q=String(rawQuery||'').trim();
    if(!q)return;
    const id=++searchId.current;
    setPage(1);setError('');setResults([]);setCultureKeyword(null);setStatus(`搜尋「${collection.label}」資料…`);
    try{
      if(collection.id==='政德文化'||collection.id==='all'){
        const cultureData=await fetchLocJson(LOC_DATA.ZHENGDE_CULTURE_KEYWORDS);
        if(id!==searchId.current)return;
        setCultureKeyword(matchCultureKeyword(cultureData,q));
      }
      const governance=await fetchLocJson(LOC_DATA.LOC_SEARCH_GOVERNANCE);
      if(id!==searchId.current)return;
      const governed=applySearchGovernance(q,governance);
      if(governed.outOfDomain){setStatus(`「${collection.label}」中的「${q}」找到 0 筆顯示結果。`);return;}
      const terms=governed.terms;
      const routingQuery=governed.routingQuery||q;
      const found=[];

      if(collection.smallSources.length){
        const requests=collection.smallSources.map(([path,label])=>({path,label}));
        const data=await fetchLocJsonBatch(requests,{concurrency:2});
        if(id!==searchId.current)return;
        for(let index=0;index<requests.length;index+=1){
          collectGeneric(data[index],requests[index].label,terms,q,found);
          if(found.length>=MAX_RAW_RESULTS)break;
        }
      }

      async function scanDataset(datasetId,kind){
        if(found.length>=MAX_RAW_RESULTS)return;
        const started=performance.now();
        const dataset=await getLocDataDataset(datasetId);
        const segments=await rankSearchSegments(datasetId,Array.isArray(dataset?.segments)?dataset.segments:[],routingQuery);
        let loadedSegments=0,loadedBytes=0,datasetHits=0;
        for(let offset=0;offset<segments.length&&found.length<MAX_RAW_RESULTS;offset+=SEGMENT_BATCH_SIZE){
          if(id!==searchId.current)return;
          const chunk=segments.slice(offset,offset+SEGMENT_BATCH_SIZE);
          const loaded=await fetchLocDataSegments(datasetId,{segmentIds:chunk.map(segment=>segment.id),maxSegments:SEGMENT_BATCH_SIZE});
          loadedSegments+=loaded.length;
          loadedBytes+=loaded.reduce((sum,item)=>sum+Number(item.segment?.bytes||0),0);
          for(const item of loaded){
            const before=found.length;
            if(kind==='text')collectText(item.data,terms,q,found);
            else collectMusic(item.data,terms,q,found);
            const hits=found.length-before;
            datasetHits+=hits;
            if(hits>0)await recordSearchSegmentHits(datasetId,item.segment.id,routingQuery,hits);
          }
        }
        recordSearchTelemetry({collection:collection.id,dataset:datasetId,segments:loadedSegments,bytes:loadedBytes,hits:datasetHits,elapsedMs:performance.now()-started});
      }

      if(collection.includeTextCorpus)await scanDataset(SEARCH_DATASETS_V2.text,'text');
      if(collection.includeMusic)await scanDataset(SEARCH_DATASETS_V2.music,'music');
      if(id!==searchId.current)return;

      const unique=[],seen=new Set();
      for(const row of found){
        const key=`${row.source}|${row.title}|${row.snippet}`;
        if(!seen.has(key)){seen.add(key);unique.push(row);}
        if(unique.length>=60)break;
      }
      setResults(unique);
      setStatus(`「${collection.label}」中的「${q}」找到 ${unique.length} 筆顯示結果。`);
    }catch(e){
      if(id===searchId.current){setError(String(e?.message||e));setStatus('搜尋失敗。');}
    }
  }

  useEffect(()=>{if(query.trim())executeSearch(query);},[scopeId]);
  async function runSearch(event){event.preventDefault();await executeSearch(query);}

  return <FeaturePageV2 featureId="search" subtitle={collection.description}>
    <form className="scope-v2-search-form" onSubmit={runSearch}>
      <input value={query} onChange={event=>setQuery(event.target.value)} placeholder="輸入關鍵字，例如：治理、月、自由" aria-label="搜尋文字"/>
      <button type="submit">搜尋</button>
    </form>
    <p className="scope-v2-status">{status}{results.length?` · 每頁 ${pageSize} 筆`:''}</p>
    {error?<p className="scope-v2-status scope-v2-error">{error}</p>:null}
    {cultureKeyword?<ScopeCardV2 eyebrow="政德文化關鍵字" title={cultureKeyword.name}>
      <p>{cultureKeyword.summary}</p>
      {cultureKeyword.outline?.length?<p>{cultureKeyword.outline.join(' → ')}</p>:null}
      {cultureKeyword.related?.length?<p>相關概念：{cultureKeyword.related.join('、')}</p>:null}
      {cultureWorks.length?<ul>{cultureWorks.map(work=><li key={work.key}><strong>{work.title}</strong> · {work.source}</li>)}</ul>:null}
      <p><a href={`${featureHrefV2(scopeId,'context')}?q=${encodeURIComponent(cultureKeyword.name)}`}>脈絡分析</a></p>
    </ScopeCardV2>:null}
    <div className="scope-v2-list">
      {shownResults.map(row=><ScopeCardV2 key={row.key} eyebrow={row.source} title={row.title}>
        {row.date?<p className="scope-v2-meta">{row.date}</p>:null}
        <p>{row.snippet}</p>
        {row.href?<p><a href={row.href} target={/^https?:/.test(row.href)?'_blank':undefined} rel={/^https?:/.test(row.href)?'noreferrer':undefined}>查看來源</a></p>:null}
      </ScopeCardV2>)}
    </div>
    {results.length?<div className="scope-v2-pagination">
      <span>{page} / {pageCount}</span>
      <div>
        <button type="button" disabled={page<=1} onClick={()=>setPage(value=>Math.max(1,value-1))}>上一頁</button>
        <button type="button" disabled={page>=pageCount} onClick={()=>setPage(value=>Math.min(pageCount,value+1))}>下一頁</button>
      </div>
    </div>:null}
  </FeaturePageV2>;
}
