'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchLocDataSegments, fetchLocJsonBatch, getLocDataDataset } from '../data';
import { recordSearchSegmentHits, rankSearchSegments } from '../search-routing';
import { useLocalStore } from '../local-store';
import { getSearchCollection, SEARCH_COLLECTION_ORDER, SEARCH_COLLECTIONS } from '../search-collections';

const UI_SETTINGS_KEY='loc-ui-settings-v1';
const DEFAULT_UI_SETTINGS={draw_response:'ritual',list_page_size:10};
const LIST_PAGE_OPTIONS=[5,10,15,20,25,50];
const MAX_RAW_RESULTS=120;
const SEGMENT_BATCH_SIZE=2;
const norm=value=>String(value??'').toLocaleLowerCase('zh-Hant').replace(/[\s\u3000]+/g,'');
const snippet=(text,q)=>{const raw=String(text||'').replace(/\s+/g,' ').trim();const i=norm(raw).indexOf(norm(q));const start=Math.max(0,(i<0?0:i)-70);return `${start?'…':''}${raw.slice(start,start+220)}${raw.length>start+220?'…':''}`;};
function objectsFrom(value,out=[],depth=0){if(depth>4)return out;if(Array.isArray(value)){for(const item of value){if(item&&typeof item==='object'&&!Array.isArray(item))out.push(item);else objectsFrom(item,out,depth+1);}return out;}if(value&&typeof value==='object')for(const child of Object.values(value))if(Array.isArray(child))objectsFrom(child,out,depth+1);return out;}
function genericResult(item,source,q){const hay=JSON.stringify(item);if(!norm(hay).includes(norm(q)))return null;const title=item.title||item.name||item['符文名稱']||item['名稱']||item.question||item.label||item.id||item.work_id||source;const body=item.text||item.content||item.answer||item.summary||item.description||item.retrieval_text||hay;return {key:`${source}-${title}-${body.slice(0,30)}`,source,title,date:item.date||item.created_date||item.updated_at||'',snippet:snippet(body,q),href:item.url||item.href||''};}
function collectText(data,q,found){for(const d of data?.documents||[]){const hay=`${d.title||''} ${d.section||''} ${d.retrieval_text||d.text||''}`;if(norm(hay).includes(norm(q)))found.push({key:d.id,source:'文字創作',title:[d.title,d.section].filter(Boolean).join(' · '),date:d.date||'',snippet:snippet(d.text||d.retrieval_text,q)});if(found.length>=MAX_RAW_RESULTS)return;}}
function collectMusic(data,q,found){for(const w of data?.works||[]){const hay=`${w.title||''} ${w.summary||''} ${w.style||''} ${(w.tags||[]).join(' ')} ${w.retrieval_text||''}`;if(norm(hay).includes(norm(q)))found.push({key:w.work_id,source:'音樂',title:w.title,date:w.created_date||'',snippet:snippet(w.summary||w.retrieval_text,q),href:w.versions?.[0]?.suno_url||''});if(found.length>=MAX_RAW_RESULTS)return;}}
function collectGeneric(data,label,q,found){for(const item of objectsFrom(data)){const r=genericResult(item,label,q);if(r)found.push(r);if(found.length>=MAX_RAW_RESULTS)return;}}

export default function SearchView(){
  const {value:uiSettings}=useLocalStore(UI_SETTINGS_KEY,DEFAULT_UI_SETTINGS);
  const [query,setQuery]=useState('');
  const [collectionId,setCollectionId]=useState('all');
  const [results,setResults]=useState([]);
  const [status,setStatus]=useState('輸入文字後才會載入搜尋資料。');
  const [error,setError]=useState('');
  const [page,setPage]=useState(1);
  const searchId=useRef(0);
  const pageSize=LIST_PAGE_OPTIONS.includes(Number(uiSettings?.list_page_size))?Number(uiSettings.list_page_size):10;
  const pageCount=Math.max(1,Math.ceil(results.length/pageSize));
  const shownResults=results.slice((page-1)*pageSize,page*pageSize);

  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    const requested=params.get('c')||'all';
    const q=params.get('q')||'';
    setCollectionId(getSearchCollection(requested).id);
    setQuery(q);
  },[]);
  useEffect(()=>setPage(1),[collectionId,pageSize]);
  useEffect(()=>{if(page>pageCount)setPage(pageCount)},[page,pageCount]);

  function syncUrl(nextCollection,nextQuery){
    const url=new URL(window.location.href);
    if(nextCollection&&nextCollection!=='all')url.searchParams.set('c',nextCollection);else url.searchParams.delete('c');
    if(nextQuery)url.searchParams.set('q',nextQuery);else url.searchParams.delete('q');
    window.history.replaceState(null,'',`${url.pathname}${url.search}${url.hash}`);
  }

  async function runSearch(event){
    event.preventDefault();
    const q=query.trim();
    if(!q)return;
    const collection=getSearchCollection(collectionId);
    syncUrl(collection.id,q);
    const id=++searchId.current;
    setPage(1);setError('');setResults([]);setStatus(`搜尋「${collection.label}」資料…`);
    try{
      const found=[];
      const smallRequests=collection.smallSources.map(([path,label])=>({path,label}));
      if(smallRequests.length){
        const smallData=await fetchLocJsonBatch(smallRequests,{concurrency:2});
        if(id!==searchId.current)return;
        for(let index=0;index<smallRequests.length;index+=1){
          collectGeneric(smallData[index],smallRequests[index].label,q,found);
          if(found.length>=MAX_RAW_RESULTS)break;
        }
      }

      async function scanDataset(datasetId,kind){
        if(found.length>=MAX_RAW_RESULTS)return;
        const dataset=await getLocDataDataset(datasetId);
        const sourceSegments=Array.isArray(dataset?.segments)?dataset.segments:[];
        const segments=await rankSearchSegments(datasetId,sourceSegments,q);
        for(let offset=0;offset<segments.length&&found.length<MAX_RAW_RESULTS;offset+=SEGMENT_BATCH_SIZE){
          if(id!==searchId.current)return;
          const chunk=segments.slice(offset,offset+SEGMENT_BATCH_SIZE);
          const loaded=await fetchLocDataSegments(datasetId,{segmentIds:chunk.map(segment=>segment.id),maxSegments:SEGMENT_BATCH_SIZE});
          if(id!==searchId.current)return;
          for(const item of loaded){
            const before=found.length;
            if(kind==='text')collectText(item.data,q,found);
            else if(kind==='music')collectMusic(item.data,q,found);
            const hits=found.length-before;
            if(hits>0)await recordSearchSegmentHits(datasetId,item.segment.id,q,hits);
            if(found.length>=MAX_RAW_RESULTS)break;
          }
        }
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
    <form className="loc-search-form" onSubmit={runSearch}>
      <select value={collectionId} onChange={e=>{setCollectionId(e.target.value);syncUrl(e.target.value,query)}} aria-label="搜尋集合">{SEARCH_COLLECTION_ORDER.map(id=><option key={id} value={id}>{SEARCH_COLLECTIONS[id].label}</option>)}</select>
      <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="輸入關鍵字，例如：治理、月、自由" aria-label="搜尋文字"/>
      <button className="loc-button primary" type="submit">搜尋</button>
    </form>
    <p className="loc-status">{status}{results.length?` · 每頁 ${pageSize} 筆`:''}</p>{error&&<p className="loc-status error">{error}</p>}
    <div className="loc-search-results">{shownResults.map(r=><article className="loc-card" key={r.key}><div className="loc-result-meta"><span>{r.source}</span>{r.date&&<time>{r.date}</time>}</div><h2>{r.title}</h2><p>{r.snippet}</p>{r.href&&<a href={r.href} target={/^https?:/.test(r.href)?'_blank':undefined} rel={/^https?:/.test(r.href)?'noreferrer':undefined}>查看來源</a>}</article>)}</div>
    {!!results.length&&<div className="runes-pager"><button type="button" disabled={page<=1} onClick={()=>setPage(value=>Math.max(1,value-1))}>上一頁</button><span>{page} / {pageCount}</span><button type="button" disabled={page>=pageCount} onClick={()=>setPage(value=>Math.min(pageCount,value+1))}>下一頁</button></div>}
  </section>;
}
