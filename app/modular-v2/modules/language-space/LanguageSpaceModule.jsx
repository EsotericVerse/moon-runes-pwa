'use client';

import {useEffect,useMemo,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {useScopeRuntimeV2} from '../../use-scope-runtime.v2';
import LanguageSpaceWorkspace from './LanguageSpaceWorkspace';
import {
  composeLanguageSpace,
  loadLanguageSpaceAnalysis,
  loadLanguageSpaceExtension,
  loadLanguageSpaceTime,
  searchLanguageSpace
} from './language-space-data';

export default function LanguageSpaceModule({
  initialQuery='',
  management=null,
  initialFace='space',
  title='立體語言空間'
}){
  const {scopeId,scope}=useScopeRuntimeV2();
  const [searchText,setSearchText]=useState(initialQuery);
  const [submitted,setSubmitted]=useState(initialQuery);

  useEffect(()=>{
    setSearchText(initialQuery);
    setSubmitted(initialQuery);
  },[initialQuery,scopeId]);

  const timeQuery=useQuery({
    queryKey:['language-space','time',scopeId],
    queryFn:()=>loadLanguageSpaceTime(scopeId),
    staleTime:5*60_000
  });

  const analysisQuery=useQuery({
    queryKey:['language-space','analysis',scopeId],
    queryFn:()=>loadLanguageSpaceAnalysis(scopeId),
    staleTime:60_000
  });

  const extensionQuery=useQuery({
    queryKey:['language-space','extension',scopeId],
    queryFn:()=>loadLanguageSpaceExtension(scopeId),
    staleTime:60_000
  });

  const searchQuery=useQuery({
    queryKey:['language-space','search',scopeId,scope.searchCollection,submitted],
    queryFn:()=>searchLanguageSpace(scope.searchCollection,submitted),
    enabled:Boolean(submitted.trim()),
    staleTime:30_000
  });

  const items=useMemo(()=>composeLanguageSpace({
    time:timeQuery.data?.items||[],
    analysis:analysisQuery.data?.items||[],
    extension:extensionQuery.data?.items||[],
    search:searchQuery.data?.items||[]
  }),[timeQuery.data,analysisQuery.data,extensionQuery.data,searchQuery.data]);

  const error=timeQuery.error||analysisQuery.error||extensionQuery.error||searchQuery.error;

  return <div className="language-space-module">
    {error?<p className="scope-v2-status scope-v2-error">{String(error?.message||error)}</p>:null}
    <LanguageSpaceWorkspace
      items={items}
      title={title}
      initialQuery={searchText}
      searchQuery={searchText}
      onSearchQueryChange={setSearchText}
      onSearch={value=>setSubmitted(String(value||'').trim())}
      searching={searchQuery.isFetching}
      management={management}
      initialFace={initialFace}
    />
  </div>;
}
