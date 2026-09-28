'use client';

import {useQuery} from '@tanstack/react-query';
import {selectNeonRows} from '../loc/neon-repository';
import {selectManagedScopeIds} from '../loc/scope-list';
import {FEATURE_LOADING_MESSAGE,featureDataErrorMessage} from './feature-data-state.v2';

function scopeLabel(id){
  if(id==='lrunes')return 'LunaRunes';
  if(id==='lo3rwang')return 'Lucas Oscar Wang';
  return id;
}
function objectEntries(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return [];
  return Object.entries(value)
    .map(([key,count])=>[String(key),Number(count)||0])
    .sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
}
async function loadScopeSummaries(){
  const ids=(await selectManagedScopeIds()).filter(id=>id!=='loc');
  const settled=await Promise.allSettled(ids.map(async id=>{
    const {rows}=await selectNeonRows('silver.'+id,{
      columns:'id,work_count,source_counts,media_count,media_counts',
      filters:[{column:'id',operator:'eq',value:id}],
      limit:1
    });
    return rows[0]||{id,work_count:0,source_counts:{},media_count:0,media_counts:{}};
  }));
  return settled
    .filter(item=>item.status==='fulfilled')
    .map(item=>item.value);
}

export default function ScopeSummaryStatsV2(){
  const query=useQuery({
    queryKey:['loc-home-scope-summary'],
    queryFn:loadScopeSummaries,
    staleTime:5*60_000
  });
  const rows=query.data||[];
  const totalWorks=rows.reduce((sum,row)=>sum+(Number(row.work_count)||0),0);
  const totalMedia=rows.reduce((sum,row)=>sum+(Number(row.media_count)||0),0);

  return <section className="loc-card home-copy-block" aria-label="LOC 資料摘要">
    <div className="home-section-heading">
      <p className="loc-eyebrow">LOC Summary</p>
      <h2>資料摘要</h2>
      <p className="loc-subtitle">只讀各 Scope 摘要，不載入作品或多媒體明細。</p>
    </div>
    {query.isFetching?<p className="scope-v2-status">{FEATURE_LOADING_MESSAGE}</p>:null}
    {query.error?<p className="scope-v2-status scope-v2-error">{featureDataErrorMessage(query.error)}</p>:null}
    {!query.isFetching&&!query.error?<>
      <div className="loc-grid two">
        <article><strong>作品總數</strong><p>{totalWorks.toLocaleString()}</p></article>
        <article><strong>多媒體總數</strong><p>{totalMedia.toLocaleString()}</p></article>
      </div>
      <div className="loc-grid two">
        {rows.map(row=><article key={row.id}>
          <h3>{scopeLabel(row.id)}</h3>
          <p>作品：{Number(row.work_count||0).toLocaleString()}</p>
          <p>多媒體：{Number(row.media_count||0).toLocaleString()}</p>
          <details>
            <summary>作品來源</summary>
            {objectEntries(row.source_counts).length
              ?<p>{objectEntries(row.source_counts).map(([key,count])=>`${key} ${count.toLocaleString()}`).join(' · ')}</p>
              :<p>目前沒有來源統計。</p>}
          </details>
          <details>
            <summary>多媒體類型</summary>
            {objectEntries(row.media_counts).length
              ?<p>{objectEntries(row.media_counts).map(([key,count])=>`${key} ${count.toLocaleString()}`).join(' · ')}</p>
              :<p>目前沒有多媒體資料。</p>}
          </details>
        </article>)}
      </div>
    </>:null}
  </section>;
}
