'use client';

import {useEffect,useMemo,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {searchNeonRows} from '../../../loc/neon-search';
import {selectScopeCultureData} from '../../../loc/neon-culture-client';
import {selectScopeRankingPage} from '../../../loc/neon-ranking-client';
import {useScopeRuntimeV2} from '../../use-scope-runtime.v2';
import LanguageSpaceWorkspace from './LanguageSpaceWorkspace';
import {mergeLanguageItems,neonSearchItems,rankingItems,timelineItems} from './language-space-model';

function rankingPlan(id){
  if(id==='runes')return [['group','keyword'],['keyword','keyword']];
  if(id==='loc')return [['group','keyword'],['keyword','keyword'],['text_type','text'],['meta_type','media'],['meta_style','media']];
  return [['text_type','text'],['text_category','text'],['meta_type','media'],['meta_style','media']];
}

export default function LanguageSpaceModule({initialQuery='',management=null,initialMode='view',title='立體語言空間'}){
  const {scopeId,scope}=useScopeRuntimeV2();
  const [searchText,setSearchText]=useState(initialQuery);
  const [submitted,setSubmitted]=useState(initialQuery);

  useEffect(()=>{setSearchText(initialQuery);setSubmitted(initialQuery)},[initialQuery,scopeId]);

  const culture=useQuery({
    queryKey:['language-space-time',scopeId],
    queryFn:()=>selectScopeCultureData(scopeId),
    staleTime:5*60_000
  });

  const rankings=useQuery({
    queryKey:['language-space-rankings',scopeId],
    queryFn:async()=>{
      const plan=rankingPlan(scopeId);
      const groups=await Promise.all(plan.map(async([type,kind])=>({
        kind,type,
        rows:(await selectScopeRankingPage(scopeId,{rankingType:type,limit:100,navigation:{}})).rows
      })));
      return groups;
    },
    staleTime:60_000
  });

  const search=useQuery({
    queryKey:['language-space-search',scopeId,scope.searchCollection,submitted],
    queryFn:()=>searchNeonRows(scope.searchCollection,submitted,{limit:5000,offset:0}),
    enabled:Boolean(submitted.trim()),
    staleTime:30_000
  });

  const items=useMemo(()=>{
    const time=timelineItems(culture.data?.timelineItems||[]);
    const ranked=(rankings.data||[]).flatMap(group=>rankingItems(group.rows,group.kind));
    const found=submitted.trim()?neonSearchItems(search.data?.rows||[]):[];
    return mergeLanguageItems(time,ranked,found);
  },[culture.data,rankings.data,search.data,submitted]);

  const error=culture.error||rankings.error||search.error;
  return <div className="language-space-module">
    {error?<p className="scope-v2-status scope-v2-error">{String(error?.message||error)}</p>:null}
    <LanguageSpaceWorkspace
      items={items}
      title={title}
      initialQuery={searchText}
      searchQuery={searchText}
      onSearchQueryChange={setSearchText}
      onSearch={value=>setSubmitted(String(value||'').trim())}
      searching={search.isFetching}
      management={management}
      initialMode={initialMode}
    />
  </div>;
}
