import Link from 'next/link';
import {notFound} from 'next/navigation';
import {selectWritingWork,selectWritingWorks,publicSourceRefs} from '../../../js/writing.js';

export const dynamic='force-static';

// Static Pages builds must not fail site-wide when Neon is temporarily
// unavailable. In that case export one explicit fallback detail route; the
// actual works remain sourced from Neon whenever the build-time read succeeds.
const NEON_UNAVAILABLE_WORK_ID='__neon_unavailable__';

export async function generateStaticParams(){
  try{
    const works=await selectWritingWorks();
    const params=works.map(work=>({workId:String(work.work_id)}));
    return params.length?params:[{workId:NEON_UNAVAILABLE_WORK_ID}];
  }catch{
    return [{workId:NEON_UNAVAILABLE_WORK_ID}];
  }
}

export const dynamicParams=false;

export async function generateMetadata({params}){
  const {workId}=await params;
  try{
    const work=await selectWritingWork(decodeURIComponent(workId));
    return work?{title:`${work.title||work.work_id}｜文字創作｜LOC`,description:work.summary||`${work.title||work.work_id}｜LOC4 文字創作`}:{title:'文字創作｜LOC'};
  }catch{return {title:'文字創作｜LOC'};}
}

export default async function WritingDetailPage({params}){
  const {workId}=await params;
  let work=null;
  try{work=await selectWritingWork(decodeURIComponent(workId));}catch{}
  if(!work){
    if(String(workId)!==NEON_UNAVAILABLE_WORK_ID)notFound();
    return <main className="page">
      <header className="hero"><p>LOC · Writing</p><h1>文字作品</h1><p>作品資料由 Neon 提供。</p></header>
      <section className="card"><p>目前無法在靜態建置時取得 Neon 作品資料，請返回文字作品索引。</p><Link href="/writing/">← 回文字作品索引</Link></section>
    </main>;
  }
  const sources=publicSourceRefs(work);
  return <main className="page">
    <header className="hero"><p>LOC4 · Writing</p><h1>{work.title||work.work_id}</h1><p>{work.summary||'此作品已收錄於 Neon canonical works。'}</p></header>
    <section className="card"><h2>作品資料</h2><div className="loc-context-list">
      <p><strong>類型：</strong>{work.content_type||'—'}</p>
      <p><strong>日期：</strong>{work.created_date||'—'}</p>
      <p><strong>時期：</strong>{work.period_name||work.period||'—'}</p>
      {(work.tags||[]).length>0&&<div className="loc-chip-list">{work.tags.map(tag=><span key={tag}>{tag}</span>)}</div>}
    </div></section>
    <section className="card"><h2>公開來源</h2>{sources.length?<div className="loc-context-list">{sources.map((ref,index)=><article className="loc-context-item" key={`${ref.url}-${index}`}><a href={ref.url} target="_blank" rel="noreferrer">{ref.title||ref.source_type||'原始公開來源'}</a>{ref.role&&<p><small>{ref.role}</small></p>}</article>)}</div>:<p>目前 Neon canonical table 未登錄可直接公開的全文來源；因此此頁只展示治理後的作品資料。</p>}</section>
    <p><Link href="/writing/">← 回文字創作</Link></p>
  </main>;
}
