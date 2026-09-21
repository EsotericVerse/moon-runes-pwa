'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {useLocalStore} from '../../loc/local-store';
import {selectNeonSearchRows} from '../../loc/neon-search';
import {getSearchCollection} from '../../loc/search-collections';
import FeaturePageV2 from '../FeaturePageV2';
import {ScopeCardV2} from '../PageShellV2';
import {useScopeRuntimeV2} from '../use-scope-runtime.v2';

const UI_SETTINGS_KEY='loc-ui-settings-v1';
const DEFAULT_UI_SETTINGS={list_page_size:10};
const LIST_PAGE_OPTIONS=[5,10,15,20,25,50];
const MAX_RESULTS=60;
const norm=value=>String(value??'').normalize('NFKC').toLocaleLowerCase('zh-Hant').replace(/[\s\u3000]+/g,'');

function rowText(row){return Object.values(row||{}).map(value=>typeof value==='string'?value:JSON.stringify(value||'')).join(' ')}
function snippet(text,q){
  const raw=String(text||'').replace(/\s+/g,' ').trim();
  const index=norm(raw).indexOf(norm(q));
  const start=Math.max(0,(index<0?0:index)-70);
  return `${start?'…':''}${raw.slice(start,start+220)}${raw.length>start+220?'…':''}`;
}
function toResult(row,source,q){
  const text=rowText(row);
  if(!norm(text).includes(norm(q)))return null;
  const title=row.title||row.name||row.display_title||row.label||row.rune_name||row.context_name||row.work_id||row.song_id||row.id||source;
  const body=row.summary||row.content||row.description||row.interpretation||row.ai_summary||row.retrieval_text||row.text||text;
  return {key:`${source}-${title}-${String(body).slice(0,40)}`,source,title:String(title),date:row.date||row.created_date||row.created_at||row.updated_at||'',snippet:snippet(body,q),href:row.url||row.href||row.suno_url||''};
}

export default function SearchV2(){
  const {scopeId,scope}=useScopeRuntimeV2();
  const searchParams=useSearchParams();
  const {value:uiSettings}=useLocalStore(UI_SETTINGS_KEY,DEFAULT_UI_SETTINGS);
  const [query,setQuery]=useState('');
  const [results,setResults]=useState([]);
  const [status,setStatus]=useState('輸入文字後才會載入搜尋資料。');
  const [error,setError]=useState('');
  const [page,setPage]=useState(1);
  const searchId=useRef(0);
  const pageSize=LIST_PAGE_OPTIONS.includes(Number(uiSettings?.list_page_size))?Number(uiSettings.list_page_size):10;
  const pageCount=Math.max(1,Math.ceil(results.length/pageSize));
  const shownResults=results.slice((page-1)*pageSize,page*pageSize);
  const collection=useMemo(()=>getSearchCollection(scope.searchCollection),[scope.searchCollection]);

  useEffect(()=>{
    const value=String(searchParams?.get('q')||'').trim();
    if(value)setQuery(value);
  },[searchParams]);
  useEffect(()=>setPage(1),[scopeId,pageSize]);
  useEffect(()=>{if(page>pageCount)setPage(pageCount)},[page,pageCount]);

  async function executeSearch(rawQuery){
    const q=String(rawQuery||'').trim();
    if(!q)return;
    const id=++searchId.current;
    setPage(1);setError('');setResults([]);setStatus(`搜尋「${collection.label}」資料…`);
    try{
      // Every submit performs a fresh Neon SELECT. No JSON loader or cache is used.
      const search=await selectNeonSearchRows(collection.id);
      if(id!==searchId.current)return;
      const unique=[];const seen=new Set();
      for(const {row,source} of search.rows){
        const result=toResult(row,source,q);
        if(!result||seen.has(result.key))continue;
        seen.add(result.key);unique.push(result);
        if(unique.length>=MAX_RESULTS)break;
      }
      setResults(unique);
      const partial=search.failures?.length?`（${search.failures.length} 張非必要資料表暫時無法查詢）`:'';
      setStatus(`「${collection.label}」中的「${q}」找到 ${unique.length} 筆顯示結果。${partial}`);
    }catch(exception){
      if(id!==searchId.current)return;
      const message=String(exception?.message||exception||'');
      const connectionError=/fetch|network|connect|timeout|failed|offline|503|502|504/i.test(message);
      setError(connectionError?'Neon 搜尋服務暫時無法連線，請稍後再試。':message||'Neon 搜尋服務暫時無法使用。');
      setStatus('搜尋失敗。');
    }
  }

  useEffect(()=>{if(query.trim())executeSearch(query);},[scopeId]);
  async function runSearch(event){event.preventDefault();await executeSearch(query)}

  return <FeaturePageV2 featureId="search" subtitle={collection.description}>
    <form className="scope-v2-search-form" onSubmit={runSearch}>
      <input value={query} onChange={event=>setQuery(event.target.value)} placeholder="輸入關鍵字，例如：治理、月、自由" aria-label="搜尋文字"/>
      <button type="submit">搜尋</button>
    </form>
    <p className="scope-v2-status">{status}{results.length?` · 每頁 ${pageSize} 筆`:''}</p>
    {error?<p className="scope-v2-status scope-v2-error">{error}</p>:null}
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
