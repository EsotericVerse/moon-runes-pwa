'use client';

import {useMemo} from 'react';
import {useSearchParams} from 'next/navigation';
import {useQuery} from '@tanstack/react-query';
import {selectNeonRows} from '../../loc/neon-repository';
import PageShellV2 from '../../modular-v2/PageShellV2';
import {featureDataErrorMessage} from '../../modular-v2/feature-data-state.v2';

function cleanTitle(value){
  return String(value||'').replace(/\s*第\d+章\s*$/,'').trim();
}

export default function LiteratureWorkClient(){
  const searchParams=useSearchParams();
  const workId=String(searchParams?.get('work')||'').trim();
  const validWorkId=workId.startsWith('lo3rwang-literature:')?workId:'';

  const query=useQuery({
    queryKey:['literature-work',validWorkId],
    enabled:Boolean(validWorkId),
    queryFn:async()=>{
      const {rows}=await selectNeonRows('api.lo3rwang_galaxy',{
        columns:'galaxy_id,work_id,title,content,created_at,source_ref',
        filters:[{column:'work_id',operator:'like',value:validWorkId+':ch%'}],
        orders:[{column:'work_id',ascending:true}],
        limit:500
      });
      return rows;
    },
    staleTime:30000
  });

  const rows=query.data||[];
  const title=useMemo(()=>cleanTitle(rows[0]?.title)||'文學作品',[rows]);

  return <PageShellV2
    eyebrow="Literature"
    title={title}
    subtitle="整部作品"
    description={<p>主題曲只連到作品本體；章節在作品頁內展開，不從歌曲透露角色或劇情關係。</p>}
  >
    <nav className="scope-v2-result-links">
      <a href="/lo3rwang/">← 作者首頁</a>
      <a href="/lo3rwang/search">搜尋</a>
    </nav>
    {!validWorkId?<p className="scope-v2-status scope-v2-error">作品連結無效。</p>:null}
    {query.isPending&&validWorkId?<p className="scope-v2-status">讀取作品…</p>:null}
    {query.error?<p className="scope-v2-status scope-v2-error">{featureDataErrorMessage(query.error)}</p>:null}
    {!query.isPending&&!query.error&&validWorkId&&!rows.length?<p className="scope-v2-status">目前找不到這部作品的正文。</p>:null}
    {rows.length?<section className="scope-v2-card scope-v2-literature-work">
      <p className="scope-v2-meta">共 {rows.length} 章</p>
      <div className="scope-v2-literature-chapters">
        {rows.map((row,index)=><article key={row.galaxy_id||row.work_id}>
          <h2>{row.title||('第 '+(index+1)+' 章')}</h2>
          <div className="scope-v2-literature-body">{row.content}</div>
        </article>)}
      </div>
    </section>:null}
  </PageShellV2>;
}
