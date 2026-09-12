import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWritingWork, publicSourceRefs, writingWorks } from '../../../lib/writing.js';

export function generateStaticParams(){
  return writingWorks.map(work=>({workId:work.work_id}));
}

export async function generateMetadata({params}){
  const {workId}=await params;
  const work=getWritingWork(decodeURIComponent(workId));
  return work?{title:`${work.title}｜文字創作｜LOC`,description:work.summary||`${work.title}｜LOC4 文字創作`}:{title:'文字創作｜LOC'};
}

export default async function WritingDetailPage({params}){
  const {workId}=await params;
  const work=getWritingWork(decodeURIComponent(workId));
  if(!work) notFound();
  const sources=publicSourceRefs(work);
  return <main className="page">
    <header className="hero"><p>LOC4 · Writing</p><h1>{work.title}</h1><p>{work.summary||'此作品已收錄於 LOC4 Writing Registry。'}</p></header>
    <section className="card"><h2>作品資料</h2><div className="loc-context-list">
      <p><strong>類型：</strong>{work.content_type||'—'}</p>
      <p><strong>日期：</strong>{work.created_date||'—'}</p>
      <p><strong>時期：</strong>{work.period_name||work.period||'—'}</p>
      {work.chapter_count!=null&&<p><strong>章數：</strong>{work.chapter_count}</p>}
      {(work.tags||[]).length>0&&<div className="loc-chip-list">{work.tags.map(tag=><span key={tag}>{tag}</span>)}</div>}
    </div></section>
    <section className="card"><h2>公開來源</h2>{sources.length?<div className="loc-context-list">{sources.map((ref,index)=><article className="loc-context-item" key={`${ref.url}-${index}`}><a href={ref.url} target="_blank" rel="noreferrer">{ref.title||ref.source_type||'原始公開來源'}</a>{ref.role&&<p><small>{ref.role}</small></p>}</article>)}</div>:<p>目前 registry 未登錄可直接公開的全文來源；因此此頁只展示治理後的作品資料，不推測或公開私人文本。</p>}</section>
    <p><Link href="/writing/">← 回文字創作</Link></p>
  </main>;
}
