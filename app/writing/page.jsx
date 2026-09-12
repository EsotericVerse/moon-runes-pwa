import Link from 'next/link';
import { writingWorks, publicSourceRefs } from '../../lib/writing.js';

export const metadata = {
  title: '文字創作｜LOC',
  description: 'LOC4 文字創作登錄作品的公開網頁索引。'
};

const works = [...writingWorks].sort((a,b)=>String(b.created_date||'').localeCompare(String(a.created_date||'')));

export default function WritingPage(){
  return <main className="page">
    <header className="hero"><p>LOC4 · Writing</p><h1>文字創作</h1><p>把 LOC4 Writing Registry 整理成可瀏覽的網頁層；作品母資料與來源不因展示而改寫。</p></header>
    <section className="card"><h2>作品索引</h2><p>目前登錄 {works.length} 筆。網頁只展示 registry 已治理的標題、摘要、時間、標籤與公開來源，不自動公開私人社群全文。</p></section>
    <section className="loc-context-list">{works.map(work=>{
      const sources=publicSourceRefs(work);
      return <article className="loc-context-item" key={work.work_id}>
        <div className="loc-result-meta"><span>{work.content_type||'writing'}</span><time>{work.created_date||'日期未定'}</time>{work.period&&<span>{work.period}</span>}</div>
        <h2><Link href={`/writing/${encodeURIComponent(work.work_id)}/`}>{work.title}</Link></h2>
        {work.summary&&<p>{work.summary}</p>}
        <div className="loc-chip-list">{(work.tags||[]).slice(0,10).map(tag=><span key={tag}>{tag}</span>)}</div>
        {sources.length>0&&<p><small>公開來源 {sources.length} 筆</small></p>}
      </article>;
    })}</section>
  </main>;
}
