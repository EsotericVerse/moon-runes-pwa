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

const PAGE_WINDOW=4;
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
  const [page,setPage]=useState(1);
  const [visiblePages,setVisiblePages]=useState([1]);
  const [hasMore,setHasMore]=useState(false);
  const searchId=useRef(0);
  const pageSize=scopeId==='runes'?8:10;
  const collection=useMemo(()=>getSearchCollection(scope.searchCollection),[scope.searchCollection]);

  useEffect(()=>{
    const value=String(searchParams?.get('q')||'').trim();
    if(value){setQuery(value);executeSearch(value,1);}
  },[searchParams]);
  useEffect(()=>{if(query.trim())executeSearch(query,1);},[scopeId]);

  async function executeSearch(rawQuery,targetPage=1){
    const q=String(rawQuery||'').trim();
    if(!q)return;
    const nextPage=Math.max(1,Number(targetPage)||1);
    const id=++searchId.current;
    setError('');setStatus(`搜尋「${collection.label}」資料…`);
    try{
      const scopeHits=scopeResults(q);
      const firstPageReserved=Math.min(scopeHits.length,pageSize);
      const dataOffset=Math.max(0,(nextPage-1)*pageSize-firstPageReserved);
      const firstPageCapacity=Math.max(0,pageSize-firstPageReserved);
      const windowCapacity=(nextPage===1?firstPageCapacity:pageSize)+(PAGE_WINDOW-1)*pageSize;
      const search=await searchNeonRows(collection.id,q,{limit:windowCapacity+1,offset:dataOffset});
      if(id!==searchId.current)return;

      const converted=[];const seen=new Set();
      for(const {row,source} of search.rows){
        const result=toResult(row,source,q,collection.id,scopeId);
        if(!result||seen.has(result.key))continue;
        seen.add(result.key);converted.push(result);
      }

      const currentCapacity=nextPage===1?firstPageCapacity:pageSize;
      const pageRows=converted.slice(0,currentCapacity);
      const displayRows=nextPage===1?[...scopeHits.slice(0,firstPageReserved),...pageRows]:pageRows;
      const availableCount=converted.length+(nextPage===1?firstPageReserved:0);
      const pageCountInWindow=Math.max(1,Math.min(PAGE_WINDOW,Math.ceil(availableCount/pageSize)));
      const pages=Array.from({length:pageCountInWindow},(_,index)=>nextPage+index);
      const more=search.rows.length>windowCapacity;

      setPage(nextPage);
      setResults(displayRows);
      setVisiblePages(pages);
      setHasMore(more);
      const partial=search.failures?.length?`（${search.failures.length} 張非必要資料表暫時無法查詢）`:'';
      setStatus(`「${collection.label}」搜尋「${q}」。${partial}`);
    }catch(exception){
      if(id!==searchId.current)return;
      const message=String(exception?.message||exception||'');
      const connectionError=/fetch|network|connect|timeout|failed|offline|503|502|504/i.test(message);
      setError(connectionError?'Neon 搜尋服務暫時無法連線，請稍後再試。':message||'Neon 搜尋服務暫時無法使用。');
      setStatus('搜尋失敗。');
    }
  }

  async function runSearch(event){event.preventDefault();await executeSearch(query,1)}
  function go(target){executeSearch(query,Math.max(1,target));}

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
    {results.length?<div className="scope-v2-pagination">
      <div>
        <button type="button" disabled={page<=1} onClick={()=>go(page-1)} aria-label="上一頁">&lt;</button>
        {visiblePages.map(value=><button type="button" key={value} aria-pressed={value===page} onClick={()=>go(value)}>{value}</button>)}
        {hasMore?<span aria-hidden="true">…</span>:null}
        <button type="button" disabled={!hasMore&&visiblePages.length<=1} onClick={()=>go(page+1)} aria-label="下一頁">&gt;</button>
        {hasMore?<button type="button" onClick={()=>go(page+PAGE_WINDOW)} aria-label="往後四頁">&gt;&gt;</button>:null}
      </div>
    </div>:null}
  </FeaturePageV2>;
}
