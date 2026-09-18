'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchLocDataSegments, fetchLocJson, fetchLocJsonBatch, getLocDataDataset, LOC_DATA } from '../data';
import { useLocalStore } from '../local-store';
import { getSearchCollection, SEARCH_COLLECTION_ORDER, SEARCH_COLLECTIONS } from '../search-collections';
import { applySearchGovernance, firstGovernedMatch } from '../search-governance';
import { recordSearchSegmentHits, rankSearchSegments, resolveReservedLanding } from '../search-routing';
import { partitionSegmentsByScope, readSearchScope } from '../search-scope';
import { recordSearchTelemetry } from '../search-telemetry';

const UI_SETTINGS_KEY='loc-ui-settings-v1';
const DEFAULT_UI_SETTINGS={draw_response:'ritual',list_page_size:10};
const LIST_PAGE_OPTIONS=[5,10,15,20,25,50];
const MAX_RAW_RESULTS=120;
const SEGMENT_BATCH_SIZE=2;
const norm=value=>String(value??'').toLocaleLowerCase('zh-Hant').replace(/[\s\u3000]+/g,'');
const snippet=(text,q)=>{const raw=String(text||'').replace(/\s+/g,' ').trim();const i=norm(raw).indexOf(norm(q));const start=Math.max(0,(i<0?0:i)-70);return `${start?'…':''}${raw.slice(start,start+220)}${raw.length>start+220?'…':''}`;};
function objectsFrom(value,out=[],depth=0){if(depth>4)return out;if(Array.isArray(value)){for(const item of value){if(item&&typeof item==='object'&&!Array.isArray(item))out.push(item);else objectsFrom(item,out,depth+1);}return out;}if(value&&typeof value==='object')for(const child of Object.values(value))if(Array.isArray(child))objectsFrom(child,out,depth+1);return out;}
function genericResult(item,source,terms,displayQuery){const hay=JSON.stringify(item);const matched=firstGovernedMatch(hay,terms);if(!matched)return null;const title=item.title||item.name||item['符文名稱']||item['名稱']||item.question||item.label||item.id||item.work_id||source;const body=item.text||item.content||item.answer||item.summary||item.description||item.retrieval_text||hay;return {key:`${source}-${title}-${body.slice(0,30)}`,source,title,date:item.date||item.created_date||item.updated_at||'',snippet:snippet(body,matched||displayQuery),href:item.url||item.href||''};}
function collectText(data,terms,displayQuery,found){for(const d of data?.documents||[]){const hay=`${d.title||''} ${d.section||''} ${d.retrieval_text||d.text||''}`;const matched=firstGovernedMatch(hay,terms);if(matched)found.push({key:d.id,source:'文字創作',title:[d.title,d.section].filter(Boolean).join(' · '),date:d.date||'',snippet:snippet(d.text||d.retrieval_text,matched||displayQuery)});if(found.length>=MAX_RAW_RESULTS)return;}}
function collectMusic(data,terms,displayQuery,found){for(const w of data?.works||[]){const hay=`${w.title||''} ${w.summary||''} ${w.style||''} ${(w.tags||[]).join(' ')} ${w.retrieval_text||''}`;const matched=firstGovernedMatch(hay,terms);if(matched)found.push({key:w.work_id,source:'音樂',title:w.title,date:w.created_date||'',snippet:snippet(w.summary||w.retrieval_text,matched||displayQuery),href:w.versions?.[0]?.suno_url||''});if(found.length>=MAX_RAW_RESULTS)return;}}
function collectGeneric(data,label,terms,displayQuery,found){for(const item of objectsFrom(data)){const r=genericResult(item,label,terms,displayQuery);if(r)found.push(r);if(found.length>=MAX_RAW_RESULTS)return;}}
function matchCultureKeyword(data,q){const target=norm(q);if(!target)return null;for(const item of data?.keywords||[]){const terms=[item.name,...(item.aliases||[])];if(terms.some(term=>norm(term)===target))return item;}for(const item of data?.keywords||[]){const terms=[item.name,...(item.aliases||[])];if(terms.some(term=>norm(term).includes(target)||target.includes(norm(term))))return item;}return null;}

export default function SearchView(){
  const {value:uiSettings}=useLocalStore(UI_SETTINGS_KEY,DEFAULT_UI_SETTINGS);
  const [query,setQuery]=useState('');
  const [collectionId,setCollectionId]=useState('all');
  const [results,setResults]=useState([]);
  const [cultureKeyword,setCultureKeyword]=useState(null);
  const [status,setStatus]=useState('輸入文字後才會載入搜尋資料。');
  const [error,setError]=useState('');
  const [page,setPage]=useState(1);
  const searchId=useRef(0);
  const pageSize=LIST_PAGE_OPTIONS.includes(Number(uiSettings?.list_page_size))?Number(uiSettings.list_page_size):10;
  const pageCount=Math.max(1,Math.ceil(results.length/pageSize));
  const shownResults=results.slice((page-1)*pageSize,page*pageSize);
  const cultureWorks=useMemo(()=>results.filter(r=>r.source!=='政德文化').slice(0,8),[results]);

  useEffect(()=>{},[]);
  useEffect(()=>setPage(1),[collectionId,pageSize]);
  useEffect(()=>{if(page>pageCount)setPage(pageCount)},[page,pageCount]);

  function syncUrl(){}

  async function runSearch(event){
    event.preventDefault();
    const q=query.trim();
    if(!q)return;
    const landing=resolveReservedLanding(q);
    if(landing){window.location.assign(landing);return;}
    const collection=getSearchCollection(collectionId);
    const activeScope=readSearchScope(new URL(window.location.href).searchParams,collection.scopeProfile);
    
    const id=++searchId.current;
    setPage(1);setError('');setResults([]);setCultureKeyword(null);setStatus(`搜尋「${collection.label}」資料…`);
    try{
      if(collection.id==='政德文化'||collection.id==='all'){
        const cultureData=await fetchLocJson(LOC_DATA.LO3RWANG_CULTURE_KEYWORDS);
        if(id!==searchId.current)return;
        setCultureKeyword(matchCultureKeyword(cultureData,q));
      }
      const governance=await fetchLocJson(LOC_DATA.LOC_SEARCH_GOVERNANCE);
      if(id!==searchId.current)return;
      const governed=applySearchGovernance(q,governance);
      if(governed.outOfDomain){setStatus(`「${collection.label}」中的「${q}」找到 0 筆顯示結果。`);return;}
      const searchTerms=governed.terms;
      const routingQuery=governed.routingQuery||q;
      const found=[];
      const smallRequests=collection.smallSources.map(([path,label])=>({path,label}));
      if(smallRequests.length){
        const smallData=await fetchLocJsonBatch(smallRequests,{concurrency:2});
        if(id!==searchId.current)return;
        for(let index=0;index<smallRequests.length;index+=1){collectGeneric(smallData[index],smallRequests[index].label,searchTerms,q,found);if(found.length>=MAX_RAW_RESULTS)break;}
      }

      async function scanDataset(datasetId,kind){
        if(found.length>=MAX_RAW_RESULTS)return;
        const started=performance.now();
        const dataset=await getLocDataDataset(datasetId);
        const sourceSegments=Array.isArray(dataset?.segments)?dataset.segments:[];
        const partitioned=partitionSegmentsByScope(sourceSegments,activeScope);
        const scopedSegments=[...partitioned.matched,...partitioned.unknown];
        const segments=await rankSearchSegments(datasetId,scopedSegments,routingQuery);
        let loadedSegments=0;let loadedBytes=0;let datasetHits=0;
        for(let offset=0;offset<segments.length&&found.length<MAX_RAW_RESULTS;offset+=SEGMENT_BATCH_SIZE){
          if(id!==searchId.current)return;
          const chunk=segments.slice(offset,offset+SEGMENT_BATCH_SIZE);
          const loaded=await fetchLocDataSegments(datasetId,{segmentIds:chunk.map(segment=>segment.id),maxSegments:SEGMENT_BATCH_SIZE});
          if(id!==searchId.current)return;
          loadedSegments+=loaded.length;loadedBytes+=loaded.reduce((sum,item)=>sum+Number(item.segment?.bytes||0),0);
          for(const item of loaded){const before=found.length;if(kind==='text')collectText(item.data,searchTerms,q,found);else if(kind==='music')collectMusic(item.data,searchTerms,q,found);const hits=found.length-before;datasetHits+=hits;if(hits>0)await recordSearchSegmentHits(datasetId,item.segment.id,routingQuery,hits);if(found.length>=MAX_RAW_RESULTS)break;}
        }
        recordSearchTelemetry({collection:collection.id,dataset:datasetId,segments:loadedSegments,bytes:loadedBytes,hits:datasetHits,elapsedMs:performance.now()-started});
      }

      if(collection.includeTextCorpus)await scanDataset('loc4-text-corpus','text');
      if(collection.includeMusic)await scanDataset('loc3-lyrics-search','music');
      if(id!==searchId.current)return;
      const unique=[];const seen=new Set();for(const r of found){const k=`${r.source}|${r.title}|${r.snippet}`;if(!seen.has(k)){seen.add(k);unique.push(r);}if(unique.length>=60)break;}
      setResults(unique);setStatus(`「${collection.label}」中的「${q}」找到 ${unique.length} 筆顯示結果。`);
    }catch(e){if(id===searchId.current){setError(e.message);setStatus('搜尋失敗。');}}
  }

  const collection=getSearchCollection(collectionId);
  return <section className="loc-view"><header className="loc-hero"><p className="loc-eyebrow">Search · 搜尋</p><h1>搜尋</h1><p>{collection.description} 大型資料清單（manifest）與資料分片（corpus shards）只有送出查詢後才下載。</p></header>
    <form id="loc-search-form" className="loc-search-form" onSubmit={runSearch}>
      <select value={collectionId} onChange={e=>{setCollectionId(e.target.value);}} aria-label="搜尋集合">{SEARCH_COLLECTION_ORDER.map(id=><option key={id} value={id}>{SEARCH_COLLECTIONS[id].label}</option>)}</select>
      <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="輸入關鍵字，例如：治理、月、自由" aria-label="搜尋文字"/>
      <button className="loc-button primary" type="submit">搜尋</button>
    </form>
    <p className="loc-status">{status}{results.length?` · 每頁 ${pageSize} 筆`:''}</p>{error&&<p className="loc-status error">{error}</p>}
    {cultureKeyword&&<article className="loc-card" id="zhengde-keyword-summary"><div className="loc-result-meta"><span>政德文化關鍵字</span>{cultureKeyword.eras?.length&&<span>{cultureKeyword.eras.join('／')}</span>}</div><h2>{cultureKeyword.name}</h2><p>{cultureKeyword.summary}</p>{!!cultureKeyword.outline?.length&&<><h3>演化大綱</h3><p>{cultureKeyword.outline.join(' → ')}</p></>}{!!cultureKeyword.related?.length&&<p className="loc-note">相關概念：{cultureKeyword.related.join('、')}</p>}<h3>作品與資料</h3>{cultureWorks.length?<ul>{cultureWorks.map(work=><li key={`culture-work-${work.key}`}><strong>{work.title}</strong> · {work.source}</li>)}</ul>:<p className="loc-note">作品索引會顯示在下方搜尋結果。</p>}<div className="loc-actions"><a className="loc-button" href="https://lo3rwang.lo3rwang.cc/culture">回政德文化首頁</a><a className="loc-button" href="https://lo3rwang.lo3rwang.cc/context">脈絡分析</a></div></article>}
    <div className="loc-search-results">{shownResults.map(r=><article className="loc-card" key={r.key}><div className="loc-result-meta"><span>{r.source}</span>{r.date&&<time>{r.date}</time>}</div><h2>{r.title}</h2><p>{r.snippet}</p>{r.href&&<a href={r.href} target={/^https?:/.test(r.href)?'_blank':undefined} rel={/^https?:/.test(r.href)?'noreferrer':undefined}>查看來源</a>}</article>)}</div>
    {!!results.length&&<div className="runes-pager"><button type="button" disabled={page<=1} onClick={()=>setPage(value=>Math.max(1,value-1))}>上一頁</button><span>{page} / {pageCount}</span><button type="button" disabled={page>=pageCount} onClick={()=>setPage(value=>Math.min(pageCount,value+1))}>下一頁</button></div>}
  </section>;
}
