import Link from 'next/link';
import {notFound} from 'next/navigation';
import {publicSourceRefs,selectWritingWork,selectWritingWorks} from '../../../js/writing.js';

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
    const work=await selectWritingWork(decodeURIComponent(String(workId||'')));
    return {title:work?.title?`${work.title}｜LOC`:'文字作品｜LOC',description:work?.summary||'LOC4 文字創作作品的公開摘要與來源。'};
  }catch{
    return {title:'文字作品｜LOC',description:'LOC4 文字創作作品的公開摘要與來源。'};
  }
}

export default async function WritingWorkPage({params}){
  const {workId}=await params;
  let work=null;
  try{work=await selectWritingWork(decodeURIComponent(String(workId||'')));}catch{}
  if(!work){
    if(String(workId)!==NEON_UNAVAILABLE_WORK_ID)notFound();
    return <main className="page">
      <header className="hero"><p>LOC · Writing</p><h1>文字作品</h1><p>作品資料由 Neon 提供。</p></header>
      <section className="card"><p>目前無法在靜態建置時取得 Neon 作品資料，請返回文字作品索引。</p><Link href="/writing/">← 回文字作品索引</Link></section>
    </main>;
  }
  const sources=publicSourceRefs(work);
  return <main className="page">
    <header className="hero">
      <p>LOC4 · Writing</p>
      <h1>{work.title||work.work_id}</h1>
      <p>作品摘要、時期與公開來源直接來自 Neon canonical tables。</p>
    </header>
    <article className="card">
      <div className="loc-result-meta">
        <span>{work.content_type||'writing'}</span>
        <time>{work.created_date||'日期未定'}</time>
        {work.period?<span>{work.period}</span>:null}
      </div>
      {work.summary?<p>{work.summary}</p>:<p>目前沒有公開摘要。</p>}
      {work.tags?.length?<div className="loc-chip-list">{work.tags.slice(0,20).map(tag=><span key={tag}>{tag}</span>)}</div>:null}
      {sources.length?<div className="loc-context-list">{sources.map((source,index)=><p key={`${source.url}-${index}`}><a href={source.url} target="_blank" rel="noreferrer">{source.title||source.url}</a></p>)}</div>:null}
      <p><Link href="/writing/">← 回文字作品索引</Link></p>
    </article>
  </main>;
}
