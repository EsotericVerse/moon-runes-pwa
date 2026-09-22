'use client';
import {useEffect,useState} from 'react';
import {fetchLocJson,LOC_DATA} from '../loc/data';
import {publicSourceRefs} from '../../js/writing.js';

export default function WritingDetailClient({workId}){
  const [work,setWork]=useState(null);const [error,setError]=useState('');
  useEffect(()=>{let live=true;fetchLocJson(LOC_DATA.LOC4_WRITING_REGISTRY,{memory:true}).then(value=>{const found=(value?.works||[]).find(item=>String(item.work_id)===decodeURIComponent(String(workId||'')));if(live)setWork(found||null);}).catch(error=>live&&setError(String(error?.message||error)));return()=>{live=false};},[workId]);
  const sources=publicSourceRefs(work);
  if(error)return <main className="page"><p className="loc-status error">{error}</p></main>;
  if(!work)return <main className="page"><header className="hero"><p>LOC4 · Writing</p><h1>文字創作</h1><p>作品資料由 Neon runtime projection 載入中…</p></header></main>;
  return <main className="page"><header className="hero"><p>LOC4 · Writing</p><h1>{work.title}</h1><p>{work.summary||'此作品已收錄於 LOC4 Writing Registry。'}</p></header><section className="card"><h2>作品資料</h2><div className="loc-context-list"><p><strong>類型：</strong>{work.content_type||'—'}</p><p><strong>日期：</strong>{work.created_date||'—'}</p><p><strong>時期：</strong>{work.period_name||work.period||'—'}</p>{work.chapter_count!=null&&<p><strong>章數：</strong>{work.chapter_count}</p>}{(work.tags||[]).length>0&&<div className="loc-chip-list">{work.tags.map(tag=><span key={tag}>{tag}</span>)}</div>}</div></section><section className="card"><h2>公開來源</h2>{sources.length?<div className="loc-context-list">{sources.map((ref,index)=><article className="loc-context-item" key={`${ref.url}-${index}`}><a href={ref.url} target="_blank" rel="noreferrer">{ref.title||ref.source_type||'原始公開來源'}</a>{ref.role&&<p><small>{ref.role}</small></p>}</article>)}</div>:<p>目前 registry 未登錄可直接公開的全文來源；此頁只展示治理後的作品資料。</p>}</section><p><a href="/writing/">← 回文字創作</a></p></main>;
}
