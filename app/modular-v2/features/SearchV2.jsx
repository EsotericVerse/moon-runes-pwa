'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {searchNeonRows} from '../../loc/neon-search';
import {getSearchCollection} from '../../loc/search-collections';
import FeaturePageV2 from '../FeaturePageV2';
import {ScopeCardV2} from '../PageShellV2';
import {useScopeRuntimeV2} from '../use-scope-runtime.v2';
import {scopeHrefV2} from '../scope-registry.v2';
import {buildSearchNavigation,featureNavigationLinks} from '../feature-navigation.v2';

const norm=value=>String(value??'').normalize('NFKC').toLocaleLowerCase('zh-Hant').replace(/[\s\u3000]+/g,'');
const SCOPE_SEARCH_ENTRIES=Object.freeze([
  {id:'runes',title:'LunaRunes／月之符文',terms:['lunarunes','月之符文','符文'],href:scopeHrefV2('runes','context')},
  {id:'lo3rwang',title:'lo3rwang',terms:['lo3rwang','王政德','政德'],href:scopeHrefV2('lo3rwang','context')}
]);

function scopeResults(q){
  const nq=norm(q);
  if(!nq)return [];
  return SCOPE_SEARCH_ENTRIES
    .filter(item=>item.terms.some(term=>norm(term).includes(nq)||nq.includes(norm(term))))
    .map(item=>({
      key:`scope-${item.id}`,source:'Scope',title:item.title,date:'',snippet:'進入此 Scope 的脈絡頁。',href:item.href,
      destinations:featureNavigationLinks({targetScope:item.id,state:{q}})
    }));
}

function rowText(row){return Object.values(row||{}).map(value=>typeof value==='string'?value:JSON.stringify(value||'')).join(' ')}
function snippet(text,q){
  const raw=String(text||'').replace(/\s+/g,' ').trim();
  const index=norm(raw).indexOf(norm(q));
  const start=Math.max(0,(index<0?0:index)-70);
  return `${start?'…':''}${raw.slice(start,start+220)}${raw.length>start+220?'…':''}`;
}
function toResult(row,source,q,collectionId,scopeId){
  const text=rowText(row);
  if(!norm(text).includes(norm(q)))return null;
  const title=row.title||row.name||row.display_title||row.label||row.rune_name||row.context_name||row.work_id||row.song_id||row.id||source;
  const body=row.summary||row.content||row.description||row.interpretation||row.ai_summary||row.retrieval_text||row.text||text;
  const navigation=buildSearchNavigation(collectionId,source,row,q,scopeId);
  return {key:`${source}-${title}-${String(body).slice(0,40)}`,source,title:String(title),date:row.date||row.created_date||row.created_at||row.updated_at||'',snippet:snippet(body,q),href:row.url||row.href||row.suno_url||'',destinations:featureNavigationLinks(navigation)};
}

export default function SearchV2(){
  const {scopeId,scope}=useScopeRuntimeV2();
  const searchParams=useSearchParams();
  const [query,setQuery]=useState('');
  const [results,setResults]=useState([]);
  const [status,setStatus]=useState('輸入文字後才會載入搜尋資料。');
  const [error,setError]=useState('');
  const [hasMore,setHasMore]=useState(false);
  const [loadingMore,setLoadingMore]=useState(false);
  const searchId=useRef(0);
  const offsetRef=useRef(0);
  const sentinelRef=useRef(null);
  const loadingRef=useRef(false);
  const pageSize=scopeId==='runes'?8:10;
  const collection=useMemo(()=>getSearchCollection(scope.searchCollection),[scope.searchCollection]);

  async function executeSearch(rawQuery){
    const q=String(rawQuery||'').trim();
    if(!q)return;
    const id=++searchId.current;
    loadingRef.current=true;
    offsetRef.current=0;
    setError('');
    setHasMore(false);
    setLoadingMore(false);
    setResults([]);
    setStatus(`搜尋「${collection.label}」資料…`);
    try{
      const scopeHits=scopeResults(q).slice(0,pageSize);
      const capacity=Math.max(0,pageSize-scopeHits.length);
      const search=capacity
        ? await searchNeonRows(collection.id,q,{limit:capacity+1,offset:0})
        : {rows:[],failures:[]};
      if(id!==searchId.current)return;

      const consumed=search.rows.slice(0,capacity);
      offsetRef.current=consumed.length;
      const converted=[];const seen=new Set(scopeHits.map(item=>item.key));
      for(const {row,source} of consumed){
        const result=toResult(row,source,q,collection.id,scopeId);
        if(!result||seen.has(result.key))continue;
        seen.add(result.key);converted.push(result);
      }
      setResults([...scopeHits,...converted]);
      setHasMore(search.rows.length>capacity);
      const partial=search.failures?.length?`（${search.failures.length} 張非必要資料表暫時無法查詢）`:'';
      setStatus(`「${collection.label}」搜尋「${q}」。${partial}`);
    }catch(exception){
      if(id!==searchId.current)return;
      const message=String(exception?.message||exception||'');
      const connectionError=/fetch|network|connect|timeout|failed|offline|503|502|504/i.test(message);
      setError(connectionError?'Neon 搜尋服務暫時無法連線，請稍後再試。':message||'Neon 搜尋服務暫時無法使用。');
      setStatus('搜尋失敗。');
    }finally{
      if(id===searchId.current)loadingRef.current=false;
    }
  }

  async function loadMore(){
    const q=query.trim();
    if(!q||!hasMore||loadingRef.current)return;
    const id=searchId.current;
    loadingRef.current=true;
    setLoadingMore(true);
    try{
      const search=await searchNeonRows(collection.id,q,{limit:pageSize+1,offset:offsetRef.current});
      if(id!==searchId.current)return;
      const consumed=search.rows.slice(0,pageSize);
      offsetRef.current+=consumed.length;
      setResults(current=>{
        const seen=new Set(current.map(item=>item.key));
        const appended=[];
        for(const {row,source} of consumed){
          const result=toResult(row,source,q,collection.id,scopeId);
          if(!result||seen.has(result.key))continue;
          seen.add(result.key);appended.push(result);
        }
        return [...current,...appended];
      });
      setHasMore(search.rows.length>pageSize);
    }catch(exception){
      if(id!==searchId.current)return;
      setError(String(exception?.message||exception||'載入下一批搜尋結果失敗。'));
      setHasMore(false);
    }finally{
      if(id===searchId.current){
        loadingRef.current=false;
        setLoadingMore(false);
      }
    }
  }

  useEffect(()=>{
    const value=String(searchParams?.get('q')||'').trim();
    if(value){setQuery(value);executeSearch(value);}
  },[searchParams]);
  useEffect(()=>{if(query.trim())executeSearch(query);},[scopeId]);

  useEffect(()=>{
    const node=sentinelRef.current;
    if(!node||!hasMore)return;
    const observer=new IntersectionObserver(entries=>{
      if(entries.some(entry=>entry.isIntersecting))loadMore();
    },{root:null,rootMargin:'160px 0px',threshold:0.01});
    observer.observe(node);
    return ()=>observer.disconnect();
  },[hasMore,query,scopeId,pageSize,results.length]);

  async function runSearch(event){event.preventDefault();await executeSearch(query)}

  return <FeaturePageV2 featureId="search" subtitle={collection.description}>
    <form className="scope-v2-search-form" onSubmit={runSearch}>
      <input value={query} onChange={event=>setQuery(event.target.value)} placeholder="輸入關鍵字，例如：治理、月、自由" aria-label="搜尋文字"/>
      <button type="submit">搜尋</button>
    </form>
    <p className="scope-v2-status">{status}</p>
    {error?<p className="scope-v2-status scope-v2-error">{error}</p>:null}
    <div className="scope-v2-list">
      {results.map(row=><ScopeCardV2 key={row.key} eyebrow={row.source} title={row.title}>
        {row.date?<p className="scope-v2-meta">{row.date}</p>:null}
        <p>{row.snippet}</p>
        {row.href?<p><a href={row.href} target={/^https?:/.test(row.href)?'_blank':undefined} rel={/^https?:/.test(row.href)?'noreferrer':undefined}>查看來源</a></p>:null}
        {row.destinations?.length?<p className="scope-v2-result-links">{row.destinations.map(destination=><a key={destination.id} href={destination.href}>{destination.label}</a>)}</p>:null}
      </ScopeCardV2>)}
    </div>
    {hasMore?<div ref={sentinelRef} className="scope-v2-load-sentinel" aria-live="polite">
      &lt; {loadingMore?'載入中…':'…'} &gt;
    </div>:null}
  </FeaturePageV2>;
}
