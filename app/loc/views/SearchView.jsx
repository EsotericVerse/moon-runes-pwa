'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchLocJson, fetchLocJsonBatch, LOC_DATA } from '../data';
import { getSearchCollection, SEARCH_COLLECTION_ORDER, SEARCH_COLLECTIONS } from '../search-collections';

const norm=value=>String(value??'').toLocaleLowerCase('zh-Hant').replace(/[\s\u3000]+/g,'');
const snippet=(text,q)=>{const raw=String(text||'').replace(/\s+/g,' ').trim();const i=norm(raw).indexOf(norm(q));const start=Math.max(0,(i<0?0:i)-70);return `${start?'…':''}${raw.slice(start,start+220)}${raw.length>start+220?'…':''}`;};
function objectsFrom(value,out=[],depth=0){if(depth>4)return out;if(Array.isArray(value)){for(const item of value){if(item&&typeof item==='object'&&!Array.isArray(item))out.push(item);else objectsFrom(item,out,depth+1);}return out;}if(value&&typeof value==='object')for(const child of Object.values(value))if(Array.isArray(child))objectsFrom(child,out,depth+1);return out;}
function genericResult(item,source,q){const hay=JSON.stringify(item);if(!norm(hay).includes(norm(q)))return null;const title=item.title||item.name||item['符文名稱']||item['名稱']||item.question||item.label||item.id||item.work_id||source;const body=item.text||item.content||item.answer||item.summary||item.description||item.retrieval_text||hay;return {key:`${source}-${title}-${body.slice(0,30)}`,source,title,date:item.date||item.created_date||item.updated_at||'',snippet:snippet(body,q),href:item.url||item.href||''};}

export default function SearchView(){
  const [query,setQuery]=useState('');
  const [collectionId,setCollectionId]=useState('all');
  const [results,setResults]=useState([]);
  const [status,setStatus]=useState('輸入文字後才會載入搜尋資料。');
  const [error,setError]=useState('');
  const searchId=useRef(0);

  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    const requested=params.get('c')||'all';
    const q=params.get('q')||'';
    setCollectionId(getSearchCollection(requested).id);
    setQuery(q);
  },[]);

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
    setError('');setResults([]);setStatus(`搜尋「${collection.label}」資料…`);
    try{
      const requests=collection.smallSources.map(([path,label])=>({path,kind:'generic',label}));
      let textManifest=null;let musicManifest=null;
      const manifestRequests=[];
      if(collection.includeTextCorpus)manifestRequests.push({key:'text',path:LOC_DATA.TEXT_CORPUS_MANIFEST});
      if(collection.includeMusic)manifestRequests.push({key:'music',path:LOC_DATA.MUSIC_SEARCH_MANIFEST});
      if(manifestRequests.length){
        const manifestData=await fetchLocJsonBatch(manifestRequests,{concurrency:2});
        manifestRequests.forEach((item,index)=>{if(item.key==='text')textManifest=manifestData[index];else musicManifest=manifestData[index];});
      }
      if(textManifest)for(const shard of textManifest.shards||[])requests.push({path:'/'+String(shard.path||'').replace(/^\//,''),kind:'text',label:'文字創作'});
      if(musicManifest)for(const shard of musicManifest.shards||[])requests.push({path:`/data/json/search/loc3/${shard}`,kind:'music',label:'音樂'});
      const data=await fetchLocJsonBatch(requests,{concurrency:2});
      if(id!==searchId.current)return;
      const found=[];
      for(let index=0;index<requests.length;index+=1){
        const p={...requests[index],data:data[index]};
        if(p.kind==='text'){
          for(const d of p.data.documents||[]){const hay=`${d.title||''} ${d.section||''} ${d.retrieval_text||d.text||''}`;if(norm(hay).includes(norm(q)))found.push({key:d.id,source:'文字創作',title:[d.title,d.section].filter(Boolean).join(' · '),date:d.date||'',snippet:snippet(d.text||d.retrieval_text,q)});}
        }else if(p.kind==='music'){
          for(const w of p.data.works||[]){const hay=`${w.title||''} ${w.summary||''} ${w.style||''} ${(w.tags||[]).join(' ')} ${w.retrieval_text||''}`;if(norm(hay).includes(norm(q)))found.push({key:w.work_id,source:'音樂',title:w.title,date:w.created_date||'',snippet:snippet(w.summary||w.retrieval_text,q),href:w.versions?.[0]?.suno_url||''});}
        }else for(const item of objectsFrom(p.data)){const r=genericResult(item,p.label,q);if(r)found.push(r);}
        if(found.length>=120)break;
      }
      const unique=[];const seen=new Set();for(const r of found){const k=`${r.source}|${r.title}|${r.snippet}`;if(!seen.has(k)){seen.add(k);unique.push(r);}if(unique.length>=60)break;}
      setResults(unique);setStatus(`「${collection.label}」中的「${q}」找到 ${unique.length} 筆顯示結果。`);
    }catch(e){if(id===searchId.current){setError(e.message);setStatus('搜尋失敗。');}}
  }

  const collection=getSearchCollection(collectionId);
  return <section className="loc-view"><header className="loc-hero"><p className="loc-eyebrow">LOC Search</p><h1>搜尋</h1><p>{collection.description} 大型 manifest 與 corpus shards 只有送出查詢後才下載。</p></header>
    <form className="loc-search-form" onSubmit={runSearch}>
      <select value={collectionId} onChange={e=>{setCollectionId(e.target.value);syncUrl(e.target.value,query)}} aria-label="搜尋集合">{SEARCH_COLLECTION_ORDER.map(id=><option key={id} value={id}>{SEARCH_COLLECTIONS[id].label}</option>)}</select>
      <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="輸入關鍵字，例如：治理、月、自由" aria-label="搜尋文字"/>
      <button className="loc-button primary" type="submit">搜尋</button>
    </form>
    <p className="loc-status">{status}</p>{error&&<p className="loc-status error">{error}</p>}
    <div className="loc-search-results">{results.map(r=><article className="loc-card" key={r.key}><div className="loc-result-meta"><span>{r.source}</span>{r.date&&<time>{r.date}</time>}</div><h2>{r.title}</h2><p>{r.snippet}</p>{r.href&&<a href={r.href} target={/^https?:/.test(r.href)?'_blank':undefined} rel={/^https?:/.test(r.href)?'noreferrer':undefined}>查看來源</a>}</article>)}</div>
  </section>;
}
