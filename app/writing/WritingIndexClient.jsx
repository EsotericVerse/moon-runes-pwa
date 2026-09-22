'use client';
import {useEffect,useState} from 'react';
import {fetchLocJson,LOC_DATA} from '../loc/data';
import {publicSourceRefs} from '../../js/writing.js';

export default function WritingIndexClient(){
  const [works,setWorks]=useState([]);const [error,setError]=useState('');
  useEffect(()=>{let live=true;fetchLocJson(LOC_DATA.LOC4_WRITING_REGISTRY,{memory:true}).then(value=>live&&setWorks([...(value?.works||[])].sort((a,b)=>String(b.created_date||'').localeCompare(String(a.created_date||''))))).catch(error=>live&&setError(String(error?.message||error)));return()=>{live=false};},[]);
  return <main className="page"><header className="hero"><p>LOC4 · Writing</p><h1>文字創作</h1><p>作品母資料與來源由 Neon registry 提供；展示層不會把 runtime JSON 送進 public。</p></header><section className="card"><h2>作品索引</h2><p>{error||`目前登錄 ${works.length} 筆。`}</p></section><section className="loc-context-list">{works.map(work=>{const sources=publicSourceRefs(work);return <article className="loc-context-item" key={work.work_id}><div className="loc-result-meta"><span>{work.content_type||'writing'}</span><time>{work.created_date||'日期未定'}</time>{work.period&&<span>{work.period}</span>}</div><h2><a href={`/writing/${encodeURIComponent(work.work_id)}/`}>{work.title}</a></h2>{work.summary&&<p>{work.summary}</p>}<div className="loc-chip-list">{(work.tags||[]).slice(0,10).map(tag=><span key={tag}>{tag}</span>)}</div>{sources.length>0&&<p><small>公開來源 {sources.length} 筆</small></p>}</article>;})}</section></main>;
}
