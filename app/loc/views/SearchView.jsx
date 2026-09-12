'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchLocJson, fetchLocJsonBatch, LOC_DATA } from '../data';

const SMALL_SOURCES=[
  [LOC_DATA.RUNES,'月之符文資料'],
  ['/data/json/registries/LOC2_EVENT_REGISTRY.json','事件'],
  ['/data/json/registries/LOC4_WRITING_REGISTRY.json','文字創作'],
  ['/data/json/registries/LOC6_GOVERNANCE_REGISTRY.json','治理'],
  ['/data/json/registries/LOC_MEDIA_REGISTRY.json','多媒體'],
  ['/data/json/registries/LOC_KNOWLEDGE_ASSET_REGISTRY.json','知識庫'],
  ['/data/json/search/faq/LOC_FAQ_RAG_v0.4.json','FAQ']
];
const norm=value=>String(value??'').toLocaleLowerCase('zh-Hant').replace(/[\s\u3000]+/g,'');
const snippet=(text,q)=>{const raw=String(text||'').replace(/\s+/g,' ').trim();const i=norm(raw).indexOf(norm(q));const start=Math.max(0,(i<0?0:i)-70);return `${start?'…':''}${raw.slice(start,start+220)}${raw.length>start+220?'…':''}`;};
function objectsFrom(value,out=[],depth=0){if(depth>4)return out;if(Array.isArray(value)){for(const item of value){if(item&&typeof item==='object'&&!Array.isArray(item))out.push(item);else objectsFrom(item,out,depth+1);}return out;}if(value&&typeof value==='object')for(const child of Object.values(value))if(Array.isArray(child))objectsFrom(child,out,depth+1);return out;}
function genericResult(item,source,q){const hay=JSON.stringify(item);if(!norm(hay).includes(norm(q)))return null;const title=item.title||item.name||item['符文名稱']||item.question||item.label||item.id||item.work_id||source;const body=item.text||item.content||item.answer||item.summary||item.description||item.retrieval_text||hay;return {key:`${source}-${title}-${body.slice(0,30)}`,source,title,date:item.date||item.created_date||item.updated_at||'',snippet:snippet(body,q),href:item.url||item.href||''};}

export default function SearchView(){
  const [manifests,setManifests]=useState(null);const [query,setQuery]=useState('');const [results,setResults]=useState([]);const [status,setStatus]=useState('輸入文字後才會載入 corpus shards。');const [error,setError]=useState('');const searchId=useRef(0);
  useEffect(()=>{let live=true;Promise.all([fetchLocJson(LOC_DATA.TEXT_CORPUS_MANIFEST),fetchLocJson(LOC_DATA.MUSIC_SEARCH_MANIFEST)]).then(([text,music])=>live&&setManifests({text,music})).catch(e=>live&&setError(e.message));return()=>{live=false};},[]);

  async function runSearch(event){event.preventDefault();const q=query.trim();if(!q)return;const id=++searchId.current;setError('');setResults([]);
    if(norm(q)===norm('月之符文')){try{setStatus('載入月之符文保留詞快照…');const snap=await fetchLocJson(LOC_DATA.RUNE_RESERVED_SNAPSHOT);if(id!==searchId.current)return;const rows=(snap.first_page||[]).map((x,i)=>({key:`reserved-${i}`,source:'月之符文',title:x.title||'月之符文',snippet:x.summary||'',href:x.href?.replace(/^runes\.html/,'https://lrunes.lo3rwang.cc/')||'https://lrunes.lo3rwang.cc/'}));setResults(rows);setStatus(`保留詞快照 · ${rows.length} 筆；月之符文完整功能位於獨立站。`);return;}catch(e){setError(e.message);}}
    if(!manifests){setStatus('搜尋 manifest 尚在載入。');return;}
    setStatus('搜尋中：分批載入文字、音樂與治理資料…');
    try{
      const textPaths=(manifests.text.shards||[]).map(x=>'/'+x.path.replace(/^\//,''));
      const musicPaths=(manifests.music.shards||[]).map(x=>`/data/json/search/loc3/${x}`);
      const requests=[
        ...SMALL_SOURCES.map(([path,label])=>({path,kind:'generic',label})),
        ...textPaths.map(path=>({path,kind:'text',label:'文字創作'})),
        ...musicPaths.map(path=>({path,kind:'music',label:'音樂'}))
      ];
      const data=await fetchLocJsonBatch(requests,{concurrency:4});
      const payloads=requests.map((request,index)=>({...request,data:data[index]}));
      if(id!==searchId.current)return;
      const found=[];
      for(const p of payloads){
        if(p.kind==='text'){for(const d of p.data.documents||[]){const hay=`${d.title||''} ${d.section||''} ${d.retrieval_text||d.text||''}`;if(norm(hay).includes(norm(q)))found.push({key:d.id,source:'文字創作',title:[d.title,d.section].filter(Boolean).join(' · '),date:d.date||'',snippet:snippet(d.text||d.retrieval_text,q)});}}
        else if(p.kind==='music'){for(const w of p.data.works||[]){const hay=`${w.title||''} ${w.summary||''} ${w.style||''} ${(w.tags||[]).join(' ')} ${w.retrieval_text||''}`;if(norm(hay).includes(norm(q)))found.push({key:w.work_id,source:'音樂',title:w.title,date:w.created_date||'',snippet:snippet(w.summary||w.retrieval_text,q),href:w.versions?.[0]?.suno_url||''});}}
        else for(const item of objectsFrom(p.data)){const r=genericResult(item,p.label,q);if(r)found.push(r);}
        if(found.length>=120)break;
      }
      const unique=[];const seen=new Set();for(const r of found){const k=`${r.source}|${r.title}|${r.snippet}`;if(!seen.has(k)){seen.add(k);unique.push(r);}if(unique.length>=60)break;}
      setResults(unique);setStatus(`「${q}」找到 ${unique.length} 筆顯示結果；大型資料採受控併發載入。`);
    }catch(e){if(id===searchId.current){setError(e.message);setStatus('搜尋失敗。');}}
  }

  return <section className="loc-view"><header className="loc-hero"><p className="loc-eyebrow">LOC Search</p><h1>搜尋</h1><p>跨資料源搜尋入口。首頁只載小型 manifest；送出查詢後才按需取得 corpus shards、音樂索引與治理資料。</p></header>
    <form className="loc-search-form" onSubmit={runSearch}><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="輸入關鍵字，例如：治理、月、自由" aria-label="搜尋文字"/><button className="loc-button primary" type="submit">搜尋</button></form>
    <p className="loc-status">{status}</p>{error&&<p className="loc-status error">{error}</p>}
    <div className="loc-search-results">{results.map(r=><article className="loc-card" key={r.key}><div className="loc-result-meta"><span>{r.source}</span>{r.date&&<time>{r.date}</time>}</div><h2>{r.title}</h2><p>{r.snippet}</p>{r.href&&<a href={r.href} target={/^https?:/.test(r.href)?'_blank':undefined} rel={/^https?:/.test(r.href)?'noreferrer':undefined}>查看來源</a>}</article>)}</div>
  </section>;
}
