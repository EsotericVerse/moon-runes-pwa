'use client';

import {useMemo} from 'react';
import {useQuery} from '@tanstack/react-query';
import {selectScopeCultureData} from '../../loc/neon-culture-client';
import CultureTimelineV2 from '../modules/culture-timeline/CultureTimelineV2';
import {ScopeCardV2} from '../PageShellV2';
import {scopeHrefV2} from '../scope-registry.v2';
import {useScopeRuntimeV2} from '../use-scope-runtime.v2';
import {scopeFeatureSubtitleV2} from '../page-profiles.v2';

function labelOf(item,index){return item?.display_label||item?.name||item?.title||item?.period||`時期 ${index+1}`;}
function rowsOf(data){
  return [...(data?.authorEras?.eras?.length?data.authorEras.eras:data?.eras?.eras||[])]
    .sort((a,b)=>Number(a.order||0)-Number(b.order||0));
}
function currentOf(rows){
  if(!rows.length)return null;
  return rows.findLast?.(row=>String(row?.status||'').toLowerCase()==='current'||!row?.end_date)
    || rows[rows.length-1];
}

export default function CultureV2(){
  const {scopeId}=useScopeRuntimeV2();

  const query=useQuery({
    queryKey:['culture-timeline',scopeId],
    queryFn:async()=>{
      if(scopeId==='loc'){
        const [author,runes]=await Promise.all([
          selectScopeCultureData('lo3rwang'),
          selectScopeCultureData('runes')
        ]);
        return {locSummary:true,author,runes};
      }
      return selectScopeCultureData(scopeId);
    },
    staleTime:5*60_000
  });

  const rows=useMemo(()=>scopeId==='loc'?[]:rowsOf(query.data),[query.data,scopeId]);
  const authorCurrent=useMemo(()=>scopeId==='loc'?currentOf(rowsOf(query.data?.author)):null,[query.data,scopeId]);
  const runesCurrent=useMemo(()=>scopeId==='loc'?currentOf(rowsOf(query.data?.runes)):null,[query.data,scopeId]);

  return <section className="loc-view">
    <h1>文化</h1>
    <p className="loc-subtitle">{scopeFeatureSubtitleV2(scopeId,'culture')}</p>
    {query.isPending?<p className="scope-v2-status">載入時間長河…</p>:null}
    {query.error?<p className="scope-v2-status scope-v2-error">{query.error.message}</p>:null}

    {!query.isPending&&!query.error&&scopeId==='loc'?<div className="loc-grid two">
      <ScopeCardV2 eyebrow="lo3rwang" title={authorCurrent?labelOf(authorCurrent,0):'目前沒有時期資料'}>
        {authorCurrent?.start_date?<p className="scope-v2-meta">{authorCurrent.start_date}{authorCurrent.end_date?` ～ ${authorCurrent.end_date}`:''}</p>:null}
        <p><a href={scopeHrefV2('lo3rwang','culture')}>進入 lo3rwang 時間長河</a></p>
      </ScopeCardV2>
      <ScopeCardV2 eyebrow="LunaRunes" title={runesCurrent?labelOf(runesCurrent,0):'目前沒有時期資料'}>
        {runesCurrent?.start_date?<p className="scope-v2-meta">{runesCurrent.start_date}{runesCurrent.end_date?` ～ ${runesCurrent.end_date}`:''}</p>:null}
        <p><a href={scopeHrefV2('runes','culture')}>進入月之符文時間長河</a></p>
      </ScopeCardV2>
    </div>:null}

    {!query.isPending&&!query.error&&scopeId!=='loc'?<CultureTimelineV2 items={rows} labelOf={labelOf}/>:null}
  </section>;
}
